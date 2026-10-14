import { Platform } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Provider } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type SocialProvider = 'google' | 'apple' | 'kakao';

export const enabledSocialProviders: Record<SocialProvider, boolean> = {
  google: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true',
  apple: process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === 'true',
  kakao: process.env.EXPO_PUBLIC_KAKAO_AUTH_ENABLED === 'true',
};

export async function signInWithSocial(provider: SocialProvider) {
  if (!supabase) throw new Error('서버 연결이 필요합니다.');
  if (!enabledSocialProviders[provider]) throw new Error('이 로그인 방식은 아직 연결 준비 중입니다.');
  const redirectTo = Platform.OS === 'web'
    ? `${window.location.origin}/profile`
    : ExpoLinking.createURL('profile');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return;
  if (!data.url) throw new Error('로그인 주소를 열 수 없습니다.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  const callback = new URL(result.url);
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('로그인 확인 코드가 없습니다.');
  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  if (exchanged.error) throw exchanged.error;
}
