import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { router, Slot, usePathname } from 'expo-router';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapCanvas from './src/components/MapCanvas';
import AuthPanel from './src/components/AuthPanel';
import { signInWithSocial, type SocialProvider } from './src/lib/auth';
import { completeIdentityAttempt, verifyIdentity } from './src/lib/identity';
import { CATEGORIES, CATEGORY_ICONS, type Category, type Claim, type FoundItem, type LostCase, type Organization } from './src/types';
import { createCase, createClaim, createFoundItem, getMyOrganization, isPlatformStaff, listAllCases, listItems, listMyCases, listMyClaims, listOrgClaims, listOrgItems, listPendingItems, listReports, reportItem, resolveReport, setItemVisibility, updateCaseStatus, updateClaimStatus, updateItemStatus, type ItemReport } from './src/lib/data';
import { isConfigured, supabase } from './src/lib/supabase';
import { Button, C, dateText, Field, Icon, ItemCard, s, Tag } from './src/ui';

type Tab = 'map' | 'browse' | 'request' | 'profile' | 'partner' | 'ops';
const ScreenContext = createContext<((tab: Tab) => React.ReactNode) | null>(null);
export function RoutedScreen({ tab }: { tab: Tab }) {
  const screen = useContext(ScreenContext);
  return <>{screen?.(tab)}</>;
}
const demoUser = { id: 'demo-user', email: 'demo@findajwo.app' } as User;
const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL;
const supportUrl = process.env.EXPO_PUBLIC_SUPPORT_URL;
const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL;

function Content() {
  const pathname = usePathname();
  const tab: Tab = pathname === '/browse' || pathname === '/request' || pathname === '/profile' || pathname === '/partner' || pathname === '/ops' ? pathname.slice(1) as Tab : 'map';
  const navigate = (target: Tab) => router.replace(target === 'map' ? '/' : `/${target}`);
  const [items, setItems] = useState<FoundItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [staff, setStaff] = useState(false);
  const [myCases, setMyCases] = useState<LostCase[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [orgItems, setOrgItems] = useState<FoundItem[]>([]);
  const [orgClaims, setOrgClaims] = useState<Claim[]>([]);
  const [allCases, setAllCases] = useState<LostCase[]>([]);
  const [pendingItems, setPendingItems] = useState<FoundItem[]>([]);
  const [reports, setReports] = useState<ItemReport[]>([]);
  const [selected, setSelected] = useState<FoundItem | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [category, setCategory] = useState<Category | '전체'>('전체');
  const [query, setQuery] = useState('');
  const [hiddenOrgs, setHiddenOrgs] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<LostCase['caseType']>('회수·배송');
  const [caseTitle, setCaseTitle] = useState('');
  const [caseCategory, setCaseCategory] = useState<Category>('전자기기');
  const [lastSeenAt, setLastSeenAt] = useState('');
  const [lastSeenPlace, setLastSeenPlace] = useState('');
  const [holdingPlace, setHoldingPlace] = useState('');
  const [desiredAt, setDesiredAt] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('전자기기');
  const [newPlace, setNewPlace] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [picked, setPicked] = useState<{ latitude: number; longitude: number } | null>(null);
  const [partnerAdding, setPartnerAdding] = useState(false);
  const [partnerSection, setPartnerSection] = useState<'items' | 'claims'>('items');

  const notice = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4500); };
  const refreshItems = useCallback(async () => { try { setItems(await listItems()); } catch (e: any) { notice(`목록 오류: ${e.message}`); } }, []);
  const refreshPersonal = useCallback(async (activeUser: User) => {
    try {
      const [cases, claims, organization, platformStaff] = await Promise.all([listMyCases(activeUser.id), listMyClaims(activeUser.id), getMyOrganization(activeUser.id), isPlatformStaff(activeUser.id)]);
      setMyCases(cases); setMyClaims(claims); setOrg(organization); setStaff(platformStaff);
      if (supabase) {
        const { data: identity } = await supabase.from('identity_verification_attempts').select('verified_at')
          .eq('user_id', activeUser.id).eq('status', 'verified').order('verified_at', { ascending: false }).limit(1).maybeSingle();
        setVerifiedAt(identity?.verified_at || null);
      }
      if (organization) { const [found, incoming] = await Promise.all([listOrgItems(organization.id), listOrgClaims(organization.id)]); setOrgItems(found); setOrgClaims(incoming); }
      if (platformStaff) { const [all, pending, openReports] = await Promise.all([listAllCases(), listPendingItems(), listReports()]); setAllCases(all); setPendingItems(pending); setReports(openReports); }
    } catch (e: any) { notice(`내 기록 오류: ${e.message}`); }
  }, []);
  useEffect(() => {
    Promise.resolve().then(() => refreshItems());
    AsyncStorage.getItem('hidden-orgs').then(value => { if (value) setHiddenOrgs(JSON.parse(value)); });
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) refreshPersonal(data.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) { const active = session.user; setTimeout(() => refreshPersonal(active), 0); }
      else { setMyCases([]); setMyClaims([]); setOrg(null); setStaff(false); setVerifiedAt(null); }
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshItems, refreshPersonal]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !user || !supabase) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('identityVerificationId');
    if (!id) return;
    window.history.replaceState({}, '', '/profile');
    if (params.get('code')) { Promise.resolve().then(() => notice('본인인증이 완료되지 않았습니다.')); return; }
    completeIdentityAttempt(id).then(() => { refreshPersonal(user); notice('휴대폰 명의 확인을 완료했습니다.'); })
      .catch(() => notice('본인인증 결과를 확인하지 못했습니다. 다시 시도해 주세요.'));
  }, [user, refreshPersonal]);
  const filtered = useMemo(() => items.filter(item => !hiddenOrgs.includes(item.orgId) && (category === '전체' || item.category === category) && (!query.trim() || `${item.title} ${item.place} ${item.orgName}`.toLowerCase().includes(query.trim().toLowerCase())) && item.status === '보관 중'), [items, category, query, hiddenOrgs]);
  const hideOrg = async (orgId: string) => { const next = [...new Set([...hiddenOrgs, orgId])]; setHiddenOrgs(next); await AsyncStorage.setItem('hidden-orgs', JSON.stringify(next)); setSelected(null); notice('이 보관처의 게시물을 숨겼습니다.'); };
  const clearHidden = async () => { setHiddenOrgs([]); await AsyncStorage.removeItem('hidden-orgs'); notice('숨긴 보관처를 다시 표시합니다.'); };
  const requireLogin = () => { if (user) return true; navigate('profile'); notice('계속하려면 로그인해 주세요.'); return false; };
  const requireIdentity = () => { if (!isConfigured || verifiedAt) return true; navigate('profile'); notice('소유 확인 요청 전에 휴대폰 명의 확인을 완료해 주세요.'); return false; };

  const submitAuth = async () => {
    if (!email.includes('@') || password.length < 8) { notice('이메일과 8자 이상 비밀번호를 입력해 주세요.'); return; }
    if (authMode === 'signup' && (!termsUrl || !privacyUrl)) { notice('이용약관과 개인정보 처리방침을 게시한 뒤 가입할 수 있습니다.'); return; }
    if (authMode === 'signup' && !agreed) { notice('약관과 개인정보 처리방침을 확인하고 동의해 주세요.'); return; }
    if (!supabase) return;
    setBusy(true);
    try {
      const result = authMode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
      if (result.error) throw result.error;
      if (authMode === 'signup' && !result.data.session) notice('확인 이메일을 보냈습니다. 확인 후 로그인해 주세요.');
      else { setUser(result.data.user); if (result.data.user) refreshPersonal(result.data.user); notice('로그인했습니다.'); }
    } catch (e: any) { notice(e.message || '로그인 중 오류가 발생했습니다.'); } finally { setBusy(false); }
  };
  const submitSocial = async (provider: SocialProvider) => {
    if (!termsUrl || !privacyUrl) { notice('약관과 개인정보 처리방침이 게시되면 소셜 로그인을 사용할 수 있습니다.'); return; }
    if (!agreed) { notice('약관과 개인정보 처리방침을 확인하고 동의해 주세요.'); return; }
    setBusy(true);
    try { await signInWithSocial(provider); }
    catch (e: any) { notice(e.message || '로그인 중 오류가 발생했습니다.'); }
    finally { setBusy(false); }
  };
  const beginIdentity = async () => {
    if (!user || !isConfigured) return;
    setBusy(true);
    try {
      const completed = await verifyIdentity();
      if (completed) { await refreshPersonal(user); notice('휴대폰 명의 확인을 완료했습니다.'); }
    } catch (e: any) { notice(e.message || '본인인증을 완료하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const submitCase = async () => {
    if (!requireLogin()) return;
    if (!caseTitle.trim() || !lastSeenPlace.trim() || (caseType === '회수·배송' && !holdingPlace.trim())) { notice('물건, 장소, 보관처 정보를 입력해 주세요.'); return; }
    setBusy(true);
    try {
      await createCase(user!.id, { caseType, title: caseTitle.trim(), category: caseCategory, lastSeenAt: lastSeenAt.trim() || new Date().toISOString(), lastSeenPlace: lastSeenPlace.trim(), holdingPlace: caseType === '회수·배송' ? holdingPlace.trim() : undefined, desiredAt: desiredAt.trim() || undefined, description: caseDescription.trim() });
      await refreshPersonal(user!); setCaseTitle(''); setLastSeenAt(''); setLastSeenPlace(''); setHoldingPlace(''); setDesiredAt(''); setCaseDescription(''); navigate('profile'); notice('요청을 접수했습니다. 내 기록에서 상태를 확인할 수 있습니다.');
    } catch (e: any) { notice(e.message || '접수하지 못했습니다.'); } finally { setBusy(false); }
  };
  const submitClaim = async () => {
    if (!selected || !requireLogin()) return;
    if (!requireIdentity()) return;
    if (claimMessage.trim().length < 8) { notice('공개 설명에 없는 특징을 8자 이상 적어 주세요.'); return; }
    setBusy(true);
    try { await createClaim(user!.id, selected, claimMessage.trim()); await refreshPersonal(user!); setClaimOpen(false); setSelected(null); setClaimMessage(''); notice('소유 확인 요청을 보냈습니다.'); }
    catch (e: any) { notice(e.message || '요청을 보내지 못했습니다.'); } finally { setBusy(false); }
  };
  const submitFound = async () => {
    if (!user || !org) return;
    if (!newTitle.trim() || !newPlace.trim() || !picked) { notice('물건, 보관 장소, 지도 위치를 입력해 주세요.'); return; }
    setBusy(true);
    try { await createFoundItem(org, user.id, { title: newTitle.trim(), category: newCategory, place: newPlace.trim(), latitude: picked.latitude, longitude: picked.longitude, description: newDescription.trim(), foundAt: new Date().toISOString() });
      setNewTitle(''); setNewPlace(''); setNewDescription(''); setPicked(null); setPartnerAdding(false); await Promise.all([refreshPersonal(user), refreshItems()]); notice(isConfigured ? '습득물을 등록했습니다. 운영자 검토 후 공개됩니다.' : '체험 습득물을 등록했습니다.'); }
    catch (e: any) { notice(e.message || '등록하지 못했습니다.'); } finally { setBusy(false); }
  };
  const act = async (fn: () => Promise<void>, success: string) => { setBusy(true); try { await fn(); await refreshItems(); if (user) await refreshPersonal(user); notice(success); } catch (e: any) { notice(e.message || '처리하지 못했습니다.'); } finally { setBusy(false); } };

  const mapScreen = () => <View style={{ flex: 1 }}><View style={s.mapHeader}>
    <View style={s.brandRow}><Image source={require('./assets/icon.png')} style={s.brandIcon} /><Text style={s.brand}>찾아줘</Text><View style={{ flex: 1 }} /><Pressable onPress={refreshItems} style={s.profileCircle}><Icon name="refresh-outline" size={20} /></Pressable><Pressable onPress={() => navigate('profile')} style={s.profileCircle}><Icon name="person-outline" size={20} /></Pressable></View>
    <Text style={s.heroTitle}>주변 분실물,{'\n'}지도에서 한눈에</Text><Text style={s.heroSub}>제휴 보관처의 습득 정보를 확인해 보세요</Text>
    {!isConfigured && <View style={s.demoNotice}><Icon name="information-circle-outline" size={16} color={C.dark} /><Text style={s.demoNoticeText}>체험용 예시 데이터 · 실제 습득물 아님</Text></View>}
    <Pressable onPress={() => navigate('browse')} style={s.searchBox}><Icon name="search-outline" size={20} color={C.muted} /><Text style={s.searchPlaceholder}>물건이나 장소 검색</Text><Icon name="chevron-forward" size={16} color={C.muted} /></Pressable>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 16, paddingBottom: 14 }}>{(['전체', ...CATEGORIES] as const).map(x => <Tag key={x} title={x} active={category === x} onPress={() => setCategory(x)} />)}</ScrollView>
  </View><View style={{ flex: 1, minHeight: 260 }}><MapCanvas items={filtered} selectedId={selected?.id} onSelect={setSelected} /></View><View style={s.mapBottom}>
    <View style={s.mapCountRow}><View style={s.liveDot} /><Text style={s.mapCount}>{isConfigured ? '등록된 습득물' : '예시 습득물'} {filtered.length}건</Text><View style={{ flex: 1 }} /><Pressable onPress={() => navigate('browse')}><Text style={s.linkText}>목록 보기  ›</Text></Pressable></View>
    {filtered.length ? <ItemCard item={filtered[0]} onPress={() => setSelected(filtered[0])} /> : <Text style={s.emptyText}>이 조건에 맞는 습득물이 없습니다.</Text>}
  </View></View>;

  const browseScreen = () => <ScrollView style={s.scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><Text style={s.pageTitle}>습득물 찾기</Text><Text style={s.pageSub}>제휴 장소가 보관 중인 물건을 찾아보세요</Text>
    <View style={[s.searchBox, { marginTop: 22 }]}><Icon name="search-outline" size={20} color={C.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="물건, 장소, 보관처 검색" placeholderTextColor="#9DACAA" style={{ flex: 1, fontSize: 16, color: C.ink }} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 18 }}>{(['전체', ...CATEGORIES] as const).map(x => <Tag key={x} title={x} active={category === x} onPress={() => setCategory(x)} />)}</ScrollView>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}><Text style={s.sectionTitle}>{isConfigured ? '검색 결과' : '예시 결과'} <Text style={{ color: C.teal }}>{filtered.length}</Text></Text><View style={{ flex: 1 }} /><Pressable onPress={refreshItems}><Icon name="refresh-outline" size={20} color={C.dark} /></Pressable></View>{filtered.map(item => <ItemCard key={item.id} item={item} onPress={() => setSelected(item)} />)}
    {!filtered.length && <View style={s.emptyCard}><Icon name="search-outline" size={34} color={C.muted} /><Text style={s.emptyTitle}>찾는 물건이 없나요?</Text><Text style={s.emptyText}>분실 정보를 남기거나 공식 유실물 시스템을 확인해 보세요.</Text><Button title="무료 가능성 진단" onPress={() => navigate('request')} /></View>}
    <Pressable onPress={() => Linking.openURL('https://www.lost112.go.kr/')} style={s.officialLink}><Icon name="open-outline" size={19} color={C.dark} /><Text style={s.officialText}>경찰청 LOST112에서도 확인하기</Text></Pressable>
  </ScrollView>;

  const requestScreen = () => <ScrollView style={s.scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><Text style={s.eyebrow}>무료 가능성 진단</Text><Text style={s.pageTitle}>어떤 상황인가요?</Text><Text style={s.pageSub}>필요한 정보만 먼저 받고 가능한 방법을 안내합니다.</Text>
    <View style={s.choiceRow}><Pressable onPress={() => setCaseType('회수·배송')} style={[s.choice, caseType === '회수·배송' && s.choiceActive]}><Icon name="cube-outline" size={25} color={C.dark} /><Text style={s.choiceTitle}>보관처를 알아요</Text><Text style={s.choiceSub}>직접 받으러 가기 어려워요</Text></Pressable><Pressable onPress={() => setCaseType('탐색')} style={[s.choice, caseType === '탐색' && s.choiceActive]}><Icon name="search-outline" size={25} color={C.dark} /><Text style={s.choiceTitle}>위치를 몰라요</Text><Text style={s.choiceSub}>어디부터 확인할지 궁금해요</Text></Pressable></View>
    <View style={s.infoCard}><Icon name="shield-checkmark-outline" size={21} color={C.dark} /><Text style={s.infoText}>상담은 무료입니다. 유료 진행 가능 여부와 비용은 별도로 안내하며, 동의 전 결제되지 않습니다.</Text></View>
    <Text style={[s.sectionTitle, { marginTop: 28 }]}>분실 정보</Text><Field label="잃어버린 물건 *" value={caseTitle} onChangeText={setCaseTitle} placeholder="예: 검은색 무선 이어폰" />
    <Text style={[s.fieldLabel, { marginTop: 18 }]}>종류</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 9 }}>{CATEGORIES.map(x => <Tag key={x} title={x} active={caseCategory === x} onPress={() => setCaseCategory(x)} />)}</ScrollView>
    <Field label="마지막으로 본 장소 *" value={lastSeenPlace} onChangeText={setLastSeenPlace} placeholder="예: 명동역 4번 출구 근처" /><Field label="마지막으로 본 시간" value={lastSeenAt} onChangeText={setLastSeenAt} placeholder="예: 2026-10-14 18:30" />
    {caseType === '회수·배송' && <><Field label="현재 보관처 *" value={holdingPlace} onChangeText={setHoldingPlace} placeholder="예: ○○ 카페 또는 택시회사" /><Field label="원하는 수령 시점" value={desiredAt} onChangeText={setDesiredAt} placeholder="예: 이번 주 금요일까지" /></>}
    <Field label="추가 설명" value={caseDescription} onChangeText={setCaseDescription} placeholder="특징이나 상황을 알려주세요. 연락처·주소는 아직 적지 마세요." multiline /><View style={{ height: 24 }} /><Button title={busy ? '접수 중...' : '무료로 가능성 확인하기'} onPress={submitCase} disabled={busy} />
    <Text style={s.finePrint}>요청 상태는 ‘내 정보’에서 확인할 수 있습니다. 실제 회수·배송과 결제는 운영 가능 여부 확인 후 별도로 결정됩니다.</Text><Pressable onPress={() => Linking.openURL('https://www.lost112.go.kr/')} style={s.officialLink}><Icon name="open-outline" size={19} color={C.dark} /><Text style={s.officialText}>무료 공식 검색: 경찰청 LOST112</Text></Pressable>
  </ScrollView>;

  const profileScreen = () => <ScrollView style={s.scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    {user ? <><Text style={s.pageTitle}>내 정보</Text><Text style={s.pageSub}>의뢰와 소유 확인 진행 상태를 한곳에서 확인하세요.</Text></> : null}
    {!user ? <AuthPanel mode={authMode} onModeChange={setAuthMode} email={email} onEmailChange={setEmail} password={password} onPasswordChange={setPassword}
      agreed={agreed} onAgreedChange={setAgreed} busy={busy} configured={isConfigured} termsUrl={termsUrl} privacyUrl={privacyUrl}
      onEmailSubmit={submitAuth} onSocialSubmit={submitSocial}
      onDemoStart={() => { setUser(demoUser); refreshPersonal(demoUser); notice('체험 모드입니다. 기록은 이 기기에만 저장됩니다.'); }} /> : <>
      <View style={[s.panel, { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 14 }]}><View style={s.avatar}><Icon name="person" size={24} color={C.dark} /></View><View style={{ flex: 1 }}><Text style={s.itemTitle}>{user.email || '체험 사용자'}</Text><Text style={s.itemMeta}>{isConfigured ? '찾아줘 회원' : '체험 계정'}</Text></View></View>
      <View style={[s.panel, { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 15 }]}>
        <View style={[s.avatar, { width: 44, height: 44, borderRadius: 15 }]}><Icon name={verifiedAt ? 'shield-checkmark' : 'shield-checkmark-outline'} size={24} color={C.dark} /></View>
        <View style={{ flex: 1 }}><Text style={s.itemTitle}>휴대폰 명의 확인</Text><Text style={s.itemMeta}>{!isConfigured ? '체험 모드에서는 본인확인을 진행하지 않습니다' : verifiedAt ? '인증 완료 · 안전하게 확인된 계정' : '소유 확인과 인계 전에 인증할 수 있어요'}</Text></View>
        {isConfigured && !verifiedAt && <Pressable onPress={beginIdentity} disabled={busy} style={{ padding: 8 }}><Text style={s.linkText}>인증하기</Text></Pressable>}
      </View>
      <Text style={[s.sectionTitle, { marginTop: 30 }]}>내 의뢰 <Text style={{ color: C.teal }}>{myCases.length}</Text></Text>{myCases.length ? myCases.map(x => <View key={x.id} style={s.recordCard}><View style={{ flex: 1 }}><Text style={s.recordType}>{x.caseType}</Text><Text style={s.itemTitle}>{x.title}</Text><Text style={s.itemMeta}>{x.holdingPlace || x.lastSeenPlace} · {dateText(x.createdAt)}</Text></View><Text style={s.statusPill}>{x.status}</Text></View>) : <Text style={s.emptyInline}>접수한 의뢰가 없습니다.</Text>}
      <Text style={[s.sectionTitle, { marginTop: 30 }]}>소유 확인 요청 <Text style={{ color: C.teal }}>{myClaims.length}</Text></Text>{myClaims.length ? myClaims.map(x => <View key={x.id} style={s.recordCard}><View style={{ flex: 1 }}><Text style={s.itemTitle}>{x.itemTitle}</Text><Text style={s.itemMeta}>{dateText(x.createdAt)}</Text></View><Text style={s.statusPill}>{x.status}</Text></View>) : <Text style={s.emptyInline}>보낸 확인 요청이 없습니다.</Text>}
      {org && <Pressable onPress={() => navigate('partner')} style={s.menuRow}><Icon name="storefront-outline" color={C.dark} /><Text style={s.menuText}>제휴처 관리</Text><Icon name="chevron-forward" color={C.muted} size={18} /></Pressable>}{staff && <Pressable onPress={() => navigate('ops')} style={s.menuRow}><Icon name="analytics-outline" color={C.dark} /><Text style={s.menuText}>운영 센터</Text><Icon name="chevron-forward" color={C.muted} size={18} /></Pressable>}
      <Pressable onPress={() => { if (supabase) supabase.auth.signOut(); else setUser(null); navigate('map'); }} style={s.menuRow}><Icon name="log-out-outline" color={C.muted} /><Text style={s.menuText}>로그아웃</Text><Icon name="chevron-forward" color={C.muted} size={18} /></Pressable>
      {!isConfigured && <Pressable onPress={async () => { await AsyncStorage.multiRemove(['demo-items', 'demo-cases', 'demo-claims', 'hidden-orgs']); setHiddenOrgs([]); await refreshItems(); await refreshPersonal(demoUser); notice('체험 데이터를 초기화했습니다.'); }} style={s.menuRow}><Icon name="refresh-outline" color={C.muted} /><Text style={s.menuText}>체험 데이터 초기화</Text><Icon name="chevron-forward" color={C.muted} size={18} /></Pressable>}
      {!!hiddenOrgs.length && <Pressable onPress={clearHidden} style={s.menuRow}><Icon name="eye-outline" color={C.dark} /><Text style={s.menuText}>숨긴 보관처 다시 보기 ({hiddenOrgs.length})</Text><Icon name="chevron-forward" color={C.muted} size={18} /></Pressable>}
      {isConfigured && <Pressable onPress={() => Alert.alert('계정 삭제', '의뢰와 확인 요청 기록이 함께 삭제됩니다. 계속할까요?', [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: async () => { try { const { error } = await supabase!.rpc('delete_my_account'); if (error) throw error; await supabase!.auth.signOut(); setUser(null); notice('계정이 삭제되었습니다.'); } catch (e: any) { notice(e.message); } } }])}><Text style={s.deleteText}>계정 삭제</Text></Pressable>}
    </>}
    {privacyUrl && <Pressable onPress={() => Linking.openURL(privacyUrl)} style={s.menuRow}><Icon name="lock-closed-outline" color={C.dark} /><Text style={s.menuText}>개인정보 처리방침</Text><Icon name="open-outline" color={C.muted} size={18} /></Pressable>}
    {termsUrl && <Pressable onPress={() => Linking.openURL(termsUrl)} style={s.menuRow}><Icon name="document-text-outline" color={C.dark} /><Text style={s.menuText}>이용약관</Text><Icon name="open-outline" color={C.muted} size={18} /></Pressable>}
    {supportUrl && <Pressable onPress={() => Linking.openURL(supportUrl)} style={s.menuRow}><Icon name="help-circle-outline" color={C.dark} /><Text style={s.menuText}>고객 지원</Text><Icon name="open-outline" color={C.muted} size={18} /></Pressable>}
    <View style={{ height: 35 }} />
  </ScrollView>;

  const partnerScreen = () => <ScrollView style={s.scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><Pressable onPress={() => navigate('profile')} style={s.back}><Icon name="arrow-back" size={22} /></Pressable><Text style={s.pageTitle}>제휴처 관리</Text><Text style={s.pageSub}>{org?.name}의 습득물과 확인 요청을 관리합니다.</Text><Pressable onPress={() => user && refreshPersonal(user)} style={{ marginTop: 12 }}><Text style={s.linkText}>새로고침 ↻</Text></Pressable>
    <View style={[s.choiceRow, { marginTop: 24 }]}><Tag title={`습득물 ${orgItems.length}`} active={partnerSection === 'items'} onPress={() => setPartnerSection('items')} /><Tag title={`소유 확인 ${orgClaims.length}`} active={partnerSection === 'claims'} onPress={() => setPartnerSection('claims')} /></View>
    {partnerSection === 'items' ? <><View style={{ marginTop: 22 }}><Button title={partnerAdding ? '등록 취소' : '습득물 등록'} onPress={() => setPartnerAdding(!partnerAdding)} icon={partnerAdding ? 'close-outline' : 'add-outline'} /></View>
      {partnerAdding && <View style={[s.panel, { marginTop: 16 }]}><Text style={s.sectionTitle}>새 습득물</Text><Text style={s.helper}>이름·전화번호·신분증 사진은 게시하지 마세요.</Text><Field label="물건 이름 *" value={newTitle} onChangeText={setNewTitle} placeholder="예: 검은색 무선 이어폰" /><Text style={[s.fieldLabel, { marginTop: 18 }]}>종류</Text><ScrollView horizontal contentContainerStyle={{ gap: 8, marginTop: 9 }}>{CATEGORIES.map(x => <Tag key={x} title={x} active={newCategory === x} onPress={() => setNewCategory(x)} />)}</ScrollView><Field label="보관 장소 *" value={newPlace} onChangeText={setNewPlace} placeholder="예: ○○ 카페 카운터" /><Field label="공개 설명" value={newDescription} onChangeText={setNewDescription} placeholder="고유 특징이나 개인정보는 적지 마세요." multiline /><Text style={[s.fieldLabel, { marginTop: 18 }]}>지도 위치 *</Text><Text style={s.helper}>보관 장소 위치를 지도에서 선택하세요. 개인 위치는 수집하지 않습니다.</Text><View style={{ height: 220, borderRadius: 18, overflow: 'hidden', marginTop: 10 }}><MapCanvas items={[]} picked={picked} onPick={(latitude, longitude) => setPicked({ latitude, longitude })} /></View><Text style={s.finePrint}>{picked ? `선택 위치: ${picked.latitude.toFixed(4)}, ${picked.longitude.toFixed(4)}` : '지도에서 위치를 터치하세요.'}</Text><View style={{ height: 18 }} /><Button title={busy ? '등록 중...' : '등록하기'} onPress={submitFound} disabled={busy} /></View>}
      <Text style={[s.sectionTitle, { marginTop: 30 }]}>등록한 물건</Text>{orgItems.length ? orgItems.map(x => <View key={x.id} style={s.recordCard}><View style={{ flex: 1 }}><Text style={s.itemTitle}>{x.title}</Text><Text style={s.itemMeta}>{x.place} · {x.status}</Text></View><Pressable onPress={() => act(() => updateItemStatus(x.id, x.status === '보관 중' ? '인계 완료' : '보관 중'), '상태를 바꿨습니다.')}><Text style={s.linkText}>{x.status === '보관 중' ? '인계 완료' : '다시 공개'}</Text></Pressable></View>) : <Text style={s.emptyInline}>아직 등록한 물건이 없습니다.</Text>}
    </> : <><Text style={[s.sectionTitle, { marginTop: 24 }]}>접수된 소유 확인</Text>{orgClaims.length ? orgClaims.map(x => <View key={x.id} style={[s.recordCard, { flexDirection: 'column', alignItems: 'stretch' }]}><Text style={s.itemTitle}>{x.itemTitle}</Text><Text style={[s.helper, { marginVertical: 8 }]}>{x.message}</Text><Text style={s.itemMeta}>상태: {x.status} · {dateText(x.createdAt)}</Text><View style={{ flexDirection: 'row', gap: 18, marginTop: 14 }}><Pressable onPress={() => act(() => updateClaimStatus(x.id, '확인 중'), '확인 중으로 변경했습니다.')}><Text style={s.linkText}>확인 중</Text></Pressable><Pressable onPress={() => act(() => updateClaimStatus(x.id, '인계 승인'), '승인했습니다.')}><Text style={s.linkText}>인계 승인</Text></Pressable><Pressable onPress={() => act(() => updateClaimStatus(x.id, '반려'), '반려했습니다.')}><Text style={[s.linkText, { color: C.muted }]}>반려</Text></Pressable></View></View>) : <Text style={s.emptyInline}>접수된 요청이 없습니다.</Text>}</>}
  </ScrollView>;

  const opsScreen = () => <ScrollView style={s.scroll} contentContainerStyle={s.page}><Pressable onPress={() => navigate('profile')} style={s.back}><Icon name="arrow-back" size={22} /></Pressable><Text style={s.pageTitle}>운영 센터</Text><Text style={s.pageSub}>상담과 습득물 공개 요청을 한 건씩 검토하세요.</Text><Pressable onPress={() => user && refreshPersonal(user)} style={{ marginTop: 12 }}><Text style={s.linkText}>새로고침 ↻</Text></Pressable>
    <Text style={[s.sectionTitle, { marginTop: 26 }]}>공개 검토 {pendingItems.length}건</Text>{pendingItems.map(x => <View key={x.id} style={[s.recordCard, { flexDirection: 'column', alignItems: 'stretch' }]}><Text style={s.itemTitle}>{x.title}</Text><Text style={s.itemMeta}>{x.orgName} · {x.place}</Text><Text style={s.helper}>{x.description}</Text><View style={{ flexDirection: 'row', gap: 18, marginTop: 14 }}><Pressable onPress={() => act(() => setItemVisibility(x.id, 'public'), '게시물을 공개했습니다.')}><Text style={s.linkText}>공개</Text></Pressable><Pressable onPress={() => act(() => setItemVisibility(x.id, 'hidden'), '게시물을 숨겼습니다.')}><Text style={s.linkText}>숨김</Text></Pressable></View></View>)}{!pendingItems.length && <Text style={s.emptyInline}>검토 대기 게시물이 없습니다.</Text>}
    <Text style={[s.sectionTitle, { marginTop: 26 }]}>신고 {reports.length}건</Text>{reports.map(x => <View key={x.id} style={s.recordCard}><View style={{ flex: 1 }}><Text style={s.itemTitle}>{x.reason}</Text><Text style={s.itemMeta}>게시물 {x.itemId.slice(0, 8)} · {dateText(x.createdAt)}</Text></View><Pressable onPress={() => act(async () => { await setItemVisibility(x.itemId, 'hidden'); await resolveReport(x.id); }, '게시물을 숨기고 신고를 처리했습니다.')}><Text style={s.linkText}>숨김 처리</Text></Pressable></View>)}{!reports.length && <Text style={s.emptyInline}>열린 신고가 없습니다.</Text>}
    <Text style={[s.sectionTitle, { marginTop: 26 }]}>접수된 의뢰 {allCases.length}건</Text>{allCases.map(x => <View key={x.id} style={[s.recordCard, { flexDirection: 'column', alignItems: 'stretch' }]}><Text style={s.recordType}>{x.caseType} · {x.status}</Text><Text style={s.itemTitle}>{x.title}</Text><Text style={s.itemMeta}>{x.holdingPlace || x.lastSeenPlace} · {dateText(x.createdAt)}</Text><Text style={[s.helper, { marginTop: 8 }]}>{x.description || '추가 설명 없음'}</Text><View style={{ flexDirection: 'row', gap: 17, marginTop: 16, flexWrap: 'wrap' }}>{(['확인 중', '안내 완료', '종료'] as const).map(status => <Pressable key={status} onPress={() => act(() => updateCaseStatus(x.id, status), `상태를 ${status}(으)로 변경했습니다.`)}><Text style={s.linkText}>{status}</Text></Pressable>)}</View></View>)}{!allCases.length && <Text style={s.emptyInline}>접수된 의뢰가 없습니다.</Text>}</ScrollView>;

  const screen = (target: Tab) => target === 'map' ? mapScreen() : target === 'browse' ? browseScreen() : target === 'request' ? requestScreen() : target === 'profile' ? profileScreen() : target === 'partner' && org ? partnerScreen() : opsScreen();
  return <ScreenContext.Provider value={screen}><SafeAreaView style={s.root} edges={['top', 'bottom']}><StatusBar barStyle="dark-content" backgroundColor={C.white} /><View style={{ flex: 1 }}><Slot /></View>
    {pathname !== '/identity' && <View style={s.nav}>{([['map', 'map-outline', '지도'], ['browse', 'search-outline', '찾기'], ['request', 'add-circle-outline', '무료 진단'], ['profile', 'person-outline', '내 정보']] as const).map(([target, icon, label]) => <Pressable key={target} onPress={() => navigate(target)} style={s.navItem}><Icon name={tab === target ? icon.replace('-outline', '') : icon} size={24} color={tab === target ? C.dark : '#95A4A1'} /><Text style={[s.navText, tab === target && { color: C.dark, fontWeight: '700' }]}>{label}</Text></Pressable>)}</View>}
    {!!toast && <View style={s.toast}><Text style={s.toastText}>{toast}</Text></View>}{busy && <View style={s.busy}><ActivityIndicator color={C.dark} /></View>}
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => { setSelected(null); setClaimOpen(false); }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalWrap}><Pressable style={s.scrim} onPress={() => { setSelected(null); setClaimOpen(false); }} /><ScrollView style={s.sheet} contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"><View style={s.sheetHandle} /><Pressable onPress={() => { setSelected(null); setClaimOpen(false); }} style={{ position: 'absolute', right: 24, top: 22 }}><Icon name="close" size={24} color={C.muted} /></Pressable>{selected && <><View style={[s.itemIcon, { width: 72, height: 72, marginTop: 12, marginBottom: 16 }]}><Icon name={CATEGORY_ICONS[selected.category]} size={34} color={C.dark} /></View><Text style={s.pageTitle}>{selected.title}</Text><Text style={s.pageSub}>{selected.category} · {selected.status}</Text>{selected.sample && <View style={s.demoNotice}><Icon name="information-circle-outline" size={16} color={C.dark} /><Text style={s.demoNoticeText}>이 항목은 기능 확인용 예시입니다.</Text></View>}<View style={[s.panel, { marginTop: 22 }]}><Text style={s.detailLabel}>보관 장소</Text><Text style={s.detailValue}>{selected.place}</Text><Text style={s.detailLabel}>보관처</Text><Text style={s.detailValue}>{selected.orgName}</Text><Text style={s.detailLabel}>습득 시점</Text><Text style={s.detailValue}>{dateText(selected.foundAt)}</Text></View><Text style={[s.helper, { marginTop: 18 }]}>{selected.description || '공개된 추가 설명이 없습니다.'}</Text>
      {!claimOpen ? <View style={{ marginTop: 22 }}><Button title="내 물건인지 확인 요청" onPress={() => { if (requireLogin() && requireIdentity()) setClaimOpen(true); else setSelected(null); }} /><Text style={s.finePrint}>공개 설명에 없는 특징으로 소유 여부를 확인합니다. 승인 전에는 개인정보를 공유하지 않습니다.</Text></View> : <><Field label="나만 아는 물건의 특징" value={claimMessage} onChangeText={setClaimMessage} placeholder="예: 케이스 안쪽의 스티커, 지갑 내용물 일부" multiline /><View style={{ height: 16 }} /><Button title="확인 요청 보내기" onPress={submitClaim} disabled={busy} /></>}
      <Pressable onPress={() => hideOrg(selected.orgId)} style={{ marginTop: 24 }}><Text style={[s.linkText, { color: C.muted }]}>이 보관처 숨기기</Text></Pressable>
      <Pressable onPress={() => { if (!requireLogin()) { setSelected(null); return; } act(() => reportItem(user!.id, selected.id, '부적절하거나 잘못된 습득 정보'), '신고가 접수되었습니다.'); setSelected(null); }} style={{ marginTop: 16 }}><Text style={[s.linkText, { color: C.muted }]}>이 게시물 신고하기</Text></Pressable></>}</ScrollView></KeyboardAvoidingView></Modal>
  </SafeAreaView></ScreenContext.Provider>;
}
export function AppProvider() { return <SafeAreaProvider><Content /></SafeAreaProvider>; }
