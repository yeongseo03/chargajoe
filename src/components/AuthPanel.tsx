import React, { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, C, Field, Icon } from '../ui';
import { enabledSocialProviders, type SocialProvider } from '../lib/auth';

type Props = {
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  agreed: boolean;
  onAgreedChange: (value: boolean) => void;
  busy: boolean;
  configured: boolean;
  termsUrl?: string;
  privacyUrl?: string;
  onEmailSubmit: () => void;
  onSocialSubmit: (provider: SocialProvider) => void;
  onDemoStart: () => void;
};

const providers: { id: SocialProvider; label: string; mark: string; bg: string; fg: string }[] = [
  { id: 'kakao', label: '카카오로 계속하기', mark: 'K', bg: '#FEE500', fg: '#191919' },
  { id: 'apple', label: 'Apple로 계속하기', mark: '', bg: '#171A1A', fg: '#FFFFFF' },
  { id: 'google', label: 'Google로 계속하기', mark: 'G', bg: '#FFFFFF', fg: '#4285F4' },
];

export default function AuthPanel(props: Props) {
  const [emailOpen, setEmailOpen] = useState(false);
  const policyReady = Boolean(props.termsUrl && props.privacyUrl);
  return <View style={styles.wrap}>
    <View style={styles.hero}>
      <View style={styles.heroIcon}><Image source={require('../../assets/icon.png')} style={styles.logo} /></View>
      <Text style={styles.heroTitle}>잃어버린 물건을 찾는 일,{`\n`}더 간단하게</Text>
      <Text style={styles.heroSub}>찾아줘에 로그인하고 내 요청을 이어서 확인하세요.</Text>
    </View>

    <View style={styles.card}>
      <Text style={styles.groupLabel}>간편 로그인</Text>
      {providers.map(provider => <Pressable
        key={provider.id}
        onPress={() => props.onSocialSubmit(provider.id)}
        disabled={props.busy || !props.configured}
        accessibilityRole="button"
        accessibilityLabel={provider.label}
        style={[styles.provider, { backgroundColor: provider.bg }, provider.id === 'google' && styles.outline]}
      >
        <View style={styles.providerMark}>{provider.id === 'apple' ? <Icon name="logo-apple" size={21} color={provider.fg} /> : <Text style={[styles.markText, { color: provider.fg }]}>{provider.mark}</Text>}</View>
        <Text style={[styles.providerText, { color: provider.fg }]}>{provider.label}</Text>
        {!enabledSocialProviders[provider.id] && <Text style={[styles.providerStatus, { color: provider.fg }]}>준비 중</Text>}
      </Pressable>)}

      <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>또는</Text><View style={styles.dividerLine} /></View>
      <Pressable onPress={() => setEmailOpen(!emailOpen)} style={styles.emailToggle} accessibilityRole="button">
        <View style={styles.emailIcon}><Icon name="mail-outline" size={20} color={C.dark} /></View>
        <Text style={styles.emailLabel}>이메일로 계속하기</Text>
        <Icon name={emailOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </Pressable>
      {emailOpen && <View style={styles.emailForm}>
        <View style={styles.modeRow}>
          <Pressable onPress={() => props.onModeChange('login')} style={[styles.modeTab, props.mode === 'login' && styles.modeActive]}><Text style={[styles.modeText, props.mode === 'login' && styles.modeTextActive]}>로그인</Text></Pressable>
          <Pressable onPress={() => props.onModeChange('signup')} style={[styles.modeTab, props.mode === 'signup' && styles.modeActive]}><Text style={[styles.modeText, props.mode === 'signup' && styles.modeTextActive]}>이메일 가입</Text></Pressable>
        </View>
        <Field label="이메일" value={props.email} onChangeText={props.onEmailChange} placeholder="name@example.com" keyboardType="email-address" />
        <Field label="비밀번호" value={props.password} onChangeText={props.onPasswordChange} placeholder="8자 이상" secureTextEntry />
        <View style={{ height: 20 }} />
        <Button title={props.busy ? '처리 중...' : props.mode === 'login' ? '이메일로 로그인' : '이메일로 가입'} onPress={props.onEmailSubmit}
          disabled={props.busy || !props.configured || (props.mode === 'signup' && (!policyReady || !props.agreed))} />
        {props.mode === 'signup' && <Text style={styles.emailHint}>가입 후 이메일에 도착한 확인 링크를 눌러주세요.</Text>}
      </View>}
    </View>

    <View style={styles.policyCard}>
      <Pressable onPress={() => props.onAgreedChange(!props.agreed)} style={styles.consentRow} accessibilityRole="checkbox" accessibilityState={{ checked: props.agreed }}>
        <Icon name={props.agreed ? 'checkbox' : 'square-outline'} color={C.dark} size={22} />
        <Text style={styles.consentText}>이용약관과 개인정보 처리방침을 확인하고 동의합니다.</Text>
      </Pressable>
      <View style={styles.policyLinks}>
        {props.termsUrl && <Pressable onPress={() => Linking.openURL(props.termsUrl!)}><Text style={styles.policyLink}>이용약관</Text></Pressable>}
        {props.privacyUrl && <Pressable onPress={() => Linking.openURL(props.privacyUrl!)}><Text style={styles.policyLink}>개인정보 처리방침</Text></Pressable>}
      </View>
      {!policyReady && <Text style={styles.policyHint}>로그인 제공업체와 정책 문서를 연결하는 중입니다. 계정 생성은 정책 게시 후 열립니다.</Text>}
    </View>
    {!props.configured && <View style={styles.demo}><Text style={styles.policyHint}>체험 모드에서는 실제 계정을 만들지 않습니다.</Text><Button title="체험 계정으로 시작" secondary onPress={props.onDemoStart} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 17, marginTop: 22, width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { paddingHorizontal: 5, paddingTop: 4, paddingBottom: 6 },
  heroIcon: { width: 55, height: 55, backgroundColor: C.mint, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 19 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  heroTitle: { color: C.ink, fontSize: 26, lineHeight: 34, fontWeight: '800', letterSpacing: -1 },
  heroSub: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 9 },
  card: { backgroundColor: C.white, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: C.line },
  groupLabel: { color: C.ink, fontSize: 15, fontWeight: '800', marginBottom: 15 },
  provider: { height: 53, borderRadius: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 17 },
  outline: { borderWidth: 1, borderColor: '#DDE5E3' },
  providerMark: { width: 28, alignItems: 'flex-start' }, markText: { fontSize: 19, fontWeight: '900' },
  providerText: { flex: 1, fontSize: 14, fontWeight: '800', textAlign: 'center', marginRight: 28 },
  providerStatus: { position: 'absolute', right: 15, fontSize: 10, opacity: 0.58 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 13, marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line }, dividerText: { color: C.muted, fontSize: 12 },
  emailToggle: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 51, paddingHorizontal: 12, borderRadius: 13, backgroundColor: C.bg },
  emailIcon: { width: 28, alignItems: 'center' }, emailLabel: { flex: 1, color: C.ink, fontSize: 14, fontWeight: '700' },
  emailForm: { paddingTop: 17 }, modeRow: { flexDirection: 'row', backgroundColor: C.bg, padding: 3, borderRadius: 11 },
  modeTab: { flex: 1, alignItems: 'center', padding: 9, borderRadius: 9 }, modeActive: { backgroundColor: C.white },
  modeText: { color: C.muted, fontWeight: '700', fontSize: 13 }, modeTextActive: { color: C.dark },
  emailHint: { color: C.muted, fontSize: 11, marginTop: 12, textAlign: 'center' },
  policyCard: { paddingHorizontal: 5, paddingBottom: 5 }, consentRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  consentText: { flex: 1, color: C.ink, fontSize: 12, lineHeight: 19 }, policyLinks: { flexDirection: 'row', gap: 16, marginLeft: 31, marginTop: 7 },
  policyLink: { color: C.dark, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  policyHint: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 11 }, demo: { gap: 8 },
});
