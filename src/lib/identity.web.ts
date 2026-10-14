import { supabase } from './supabase';

export type VerificationStart = { identityVerificationId: string; storeId: string; channelKey: string };

export async function startIdentityAttempt(): Promise<VerificationStart> {
  if (!supabase) throw new Error('로그인이 필요합니다.');
  const { data, error } = await supabase.functions.invoke('verify-identity', { body: { action: 'start' } });
  if (error) throw new Error('본인인증 서비스가 아직 준비되지 않았습니다.');
  return data as VerificationStart;
}

export async function completeIdentityAttempt(identityVerificationId: string) {
  if (!supabase) throw new Error('로그인이 필요합니다.');
  const { data, error } = await supabase.functions.invoke('verify-identity', {
    body: { action: 'complete', identityVerificationId },
  });
  if (error || !data?.verified) throw new Error('본인인증 결과를 확인하지 못했습니다.');
}

export async function verifyIdentity() {
  const attempt = await startIdentityAttempt();
  const page = new URL('/identity', window.location.origin);
  page.searchParams.set('identityVerificationId', attempt.identityVerificationId);
  page.searchParams.set('storeId', attempt.storeId);
  page.searchParams.set('channelKey', attempt.channelKey);
  page.searchParams.set('returnTo', 'web');
  window.location.assign(page.toString());
  return false;
}
