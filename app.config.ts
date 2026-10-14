import type { ExpoConfig } from 'expo/config';

if (process.env.EAS_BUILD_PROFILE === 'production') {
  const required = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_SUPPORT_URL', 'EXPO_PUBLIC_TERMS_URL', 'IOS_BUNDLE_IDENTIFIER'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Production build is missing: ${missing.join(', ')}`);
}

const config: ExpoConfig = {
  name: '찾아줘',
  slug: 'findajwo',
  owner: 'yeongseo_03',
  scheme: 'findajwo',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  platforms: ['ios', 'android', 'web'],
  ios: {
    icon: './assets/icon-ios.png',
    bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || 'com.findajwo.mvp',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: process.env.ANDROID_PACKAGE || 'com.findajwo.mvp',
    adaptiveIcon: {
      backgroundColor: '#008F84',
      foregroundImage: './assets/android-icon-foreground.png',
    },
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro' },
  plugins: ['expo-sqlite', 'expo-router', 'expo-status-bar', 'expo-font', 'expo-web-browser'],
  extra: { productName: '찾아줘' },
};

export default config;
