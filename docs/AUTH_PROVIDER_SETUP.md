# 로그인·휴대폰 명의 확인 연결

앱 코드, Supabase 본인확인 테이블, `verify-identity` Edge Function은 적용되어 있습니다. 외부 업체 설정 전에는 소셜 로그인과 PASS 확인을 완료할 수 없습니다. 아래 비밀값은 채팅이나 Git 저장소에 올리지 않습니다.

## 공통

1. 실제 이용약관, 개인정보 처리방침, 고객지원 페이지를 HTTPS로 게시합니다.
2. `.env.local`과 EAS 환경에 `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_SUPPORT_URL`을 설정합니다.
3. Supabase Authentication → URL Configuration에 웹 `/profile` 주소와 `findajwo://profile`을 Redirect URLs로 등록합니다. 현재 로컬 웹 미리보기 주소는 `http://localhost:19007/profile`입니다.
4. OAuth 제공업체용 Supabase 콜백 주소는 `https://npbigfqpfokecdgryusm.supabase.co/auth/v1/callback`입니다.

## Google

[Google 로그인 설정](https://supabase.com/docs/guides/auth/social-login/auth-google)에 따라 Google Cloud에서 OAuth 클라이언트를 만들고 ID·Secret을 Supabase Google 제공업체 설정에 입력합니다. 작동을 확인한 뒤 `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true`를 설정합니다.

## Apple

[Apple 로그인 설정](https://supabase.com/docs/guides/auth/social-login/auth-apple)에 따라 Apple Developer에서 Sign in with Apple 설정, Service ID, 키를 준비하고 Supabase Apple 제공업체에 등록합니다. iOS 앱은 `usesAppleSignIn` 권한이 설정되어 있습니다. 실제 iPhone의 개발 빌드에서 복귀 링크를 검증한 뒤 `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true`를 설정합니다.

## Kakao

[Kakao 로그인 설정](https://supabase.com/docs/guides/auth/social-login/auth-kakao)에 따라 Kakao Developers에서 앱을 만들고 REST API 키와 Client Secret을 Supabase Kakao 제공업체에 등록합니다. Kakao 로그인 Redirect URI에 위 Supabase 콜백 주소를 넣습니다. 테스트 후 `EXPO_PUBLIC_KAKAO_AUTH_ENABLED=true`를 설정합니다.

## PASS/통신사 명의 확인

[PortOne V2 본인인증](https://developers.portone.io/opi/ko/extra/identity-verification/readme-v2) 계정과 본인확인 채널 계약이 필요합니다. Supabase Edge Function secrets에 `PORTONE_API_SECRET`, `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`를 설정합니다. HTTPS로 배포한 찾아줘 웹 앱 주소를 `EXPO_PUBLIC_IDENTITY_WEB_URL`에 넣고, 인증 업체가 요구하는 도메인/리다이렉트 주소를 등록합니다. 인증업체가 `VERIFIED` 결과를 반환해야 서버가 계정을 인증 완료로 바꿉니다. 인증자 이름·전화번호·CI 원문은 데이터베이스에 저장하지 않습니다.

## 출시 전 확인

- 웹과 실제 iPhone에서 각 로그인 → 앱 복귀 → 로그아웃을 확인합니다.
- 기존 계정 로그인과 신규 계정 생성을 모두 확인합니다.
- PASS 인증 취소·실패·만료·성공을 확인하고, 미인증 계정의 소유 확인 요청이 서버에서 거절되는지 확인합니다.
- 인증 업체/정책 URL이 설정되기 전에는 버튼이 준비 중으로 안내되며 실제 인증 완료로 표시하지 않습니다.
