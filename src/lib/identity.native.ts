import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

type VerificationStart = { identityVerificationId: string; storeId: string; channelKey: string };

export async function completeIdentityAttempt(identityVerificationId: string) {
  if (!supabase) throw new Error('로그인이 필요합니다.');
  const { data, error } = await supabase.functions.invoke('verify-identity', {
    body: { action: 'complete', identityVerificationId },
  });
  if (error || !data?.verified) throw new Error('본인인증 결과를 확인하지 못했습니다.');
}

export async function verifyIdentity() {
  if (!supabase) throw new Error('로그인이 필요합니다.');
  const origin = process.env.EXPO_PUBLIC_IDENTITY_WEB_URL;
  if (!origin?.startsWith('https://')) throw new Error('본인인증 페이지가 아직 연결되지 않았습니다.');
  const { data, error } = await supabase.functions.invoke('verify-identity', { body: { action: 'start' } });
  if (error) throw new Error('본인인증 서비스가 아직 준비되지 않았습니다.');
  const attempt = data as VerificationStart;
  const returnUrl = ExpoLinking.createURL('profile');
  const launch = new URL('/identity', origin);
  launch.searchParams.set('identityVerificationId', attempt.identityVerificationId);
  launch.searchParams.set('storeId', attempt.storeId);
  launch.searchParams.set('channelKey', attempt.channelKey);
  const result = await WebBrowser.openAuthSessionAsync(launch.toString(), returnUrl);
  if (result.type !== 'success') return false;
  const callback = new URL(result.url);
  const id = callback.searchParams.get('identityVerificationId');
  if (id !== attempt.identityVerificationId) throw new Error('본인인증 결과가 요청과 일치하지 않습니다.');
  await completeIdentityAttempt(id);
  return true;
}
