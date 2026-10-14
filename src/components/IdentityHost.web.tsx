import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as PortOne from '@portone/browser-sdk/v2';
import { C, Icon, s } from '../ui';

export default function IdentityHost() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('identityVerificationId');
  const storeId = params.get('storeId');
  const channelKey = params.get('channelKey');
  const returnTo = params.get('returnTo') === 'web' ? 'web' : 'native';
  const [message, setMessage] = useState(params.get('code') ? '인증이 완료되지 않았습니다. 앱으로 돌아가 다시 시도해 주세요.' : '통신사 명의 확인을 진행합니다.');
  const goBack = () => { window.location.href = returnTo === 'web' ? '/profile' : 'findajwo://profile'; };
  useEffect(() => {
    // 모바일 통신사 인증은 이 HTTPS 페이지로 돌아온 뒤 앱으로 복귀한다.
    const returned = new URLSearchParams(window.location.search);
    const returnedId = returned.get('identityVerificationId');
    if (returnedId && returned.get('result') === 'complete' && !returned.get('code')) {
      const destination = returned.get('returnTo') === 'web' ? '/profile' : 'findajwo://profile';
      window.location.href = `${destination}?identityVerificationId=${encodeURIComponent(returnedId)}`;
    }
  }, []);
  const goBackWithId = (verifiedId: string) => {
    const destination = returnTo === 'web' ? '/profile' : 'findajwo://profile';
    window.location.href = `${destination}?identityVerificationId=${encodeURIComponent(verifiedId)}`;
  };
  const begin = async () => {
    if (!id || !storeId || !channelKey) { setMessage('인증 주소가 올바르지 않습니다.'); return; }
    try {
      const redirectUrl = new URL(window.location.href);
      redirectUrl.searchParams.set('result', 'complete');
      const result = await PortOne.requestIdentityVerification({ storeId, channelKey, identityVerificationId: id, redirectUrl: redirectUrl.toString() });
      if (result?.code !== undefined) throw new Error(result.message || '인증을 완료하지 못했습니다.');
      goBackWithId(id);
    } catch (error: any) { setMessage(error.message || '인증을 완료하지 못했습니다.'); }
  };
  return <View style={[s.page, { flex: 1, justifyContent: 'center', maxWidth: 500, width: '100%', alignSelf: 'center' }]}>
    <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name="shield-checkmark-outline" size={30} color={C.dark} /></View>
    <Text style={[s.pageTitle, { marginTop: 20 }]}>휴대폰 본인확인</Text>
    <Text style={[s.pageSub, { marginBottom: 24 }]}>{message}</Text>
    <Pressable onPress={begin} style={s.button}><Text style={s.buttonText}>통신사 인증 시작</Text></Pressable>
    <Pressable onPress={goBack} style={{ padding: 18, alignItems: 'center' }}><Text style={s.linkText}>앱으로 돌아가기</Text></Pressable>
  </View>;
}
