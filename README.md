# 찾아줘 MVP

Expo/React Native 기반 iOS 우선 앱입니다. 업로드한 찾아줘 로고를 화면에 적용하고, iOS 아이콘은 원본 모양을 유지한 채 투명한 네 모서리만 배경색으로 채웠습니다.

## 이번 버전의 흐름

- **이용자:** 제휴 장소의 공개 습득물을 Apple 지도에서 찾고, 비공개 특징을 적어 소유 확인을 요청합니다. 보관처를 이미 아는 경우에는 회수·배송 가능성 진단을, 모르는 경우에는 탐색 상담을 접수합니다.
- **제휴처:** 권한을 받은 직원만 습득물을 등록하고 인계 상태와 소유 확인 요청을 관리합니다. 새 게시물은 운영자 검토 후 지도에 공개됩니다.
- **운영팀:** 요청 상태, 게시물 공개, 신고를 처리합니다. 결제·수거·배송 확정은 이 버전에 포함하지 않았습니다.
- **체험 모드:** Supabase 설정이 없으면 명시적인 예시 데이터와 이 기기에만 저장되는 기록으로 흐름을 확인할 수 있습니다. 실서비스로 표시하지 않습니다.

## 실행

```bash
cd app
npm install
cp .env.example .env.local
npx expo start
```

Windows PowerShell에서는 `Copy-Item .env.example .env.local`을 사용합니다. 로컬 체험만 할 때는 `.env.local` 없이도 실행됩니다. iOS 기기에서는 Expo Go로 지도 화면을 확인할 수 있습니다.

예시 데이터가 보이는 웹 빌드는 `powershell -File scripts/build-demo.ps1`로 만들 수 있습니다. 실제 Supabase 연결 웹 빌드는 `npx expo export --platform web --output-dir dist-live --clear`로 만들며, 이때 `.env.local` 설정을 사용합니다.
로컬 미리보기는 `python scripts/serve_spa.py dist --port 19006`과 `python scripts/serve_spa.py dist-live --port 19007`로 실행합니다. 배포 시에도 `/profile`, `/identity` 같은 앱 경로를 `index.html`로 돌리는 SPA rewrite가 필요합니다.

## 서버 연결

현재 작업 PC의 `.env.local`은 Supabase 프로젝트 `npbigfqpfokecdgryusm`의 URL과 공개용 키로 연결되어 있습니다. 초기 스키마와 후속 마이그레이션을 적용했으며, 아직 실제 제휴처·습득물·운영자 계정은 등록되지 않았습니다. 정책 URL이 준비될 때까지 실제 가입은 잠겨 있습니다. 예시 데이터 화면은 기존 로컬 체험 미리보기에서 확인할 수 있습니다.

## 로그인·본인확인

로그인 화면에는 카카오, Apple, Google, 이메일 옵션이 있습니다. 이메일 로그인은 기존 Supabase Auth에 연결되어 있습니다. 소셜 버튼은 제공업체 앱과 정책 URL을 연결한 뒤 `.env.local`의 해당 `EXPO_PUBLIC_*_AUTH_ENABLED` 값을 `true`로 바꾸면 OAuth를 시작합니다. 웹 콜백은 `/profile`, iOS 콜백은 `findajwo://profile`이며 둘 다 Supabase Authentication의 Redirect URLs에 등록해야 합니다. [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple), [Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao)의 앱 ID·비밀키는 각 제공업체와 Supabase 대시보드에만 보관합니다. 앱 공개 환경변수에는 비밀키를 넣지 않습니다.

PASS/통신사 명의 확인은 PortOne V2 기준입니다. 앱은 인증 시도 ID를 서버에서 발급받고, PortOne 완료 결과를 Edge Function에서 다시 조회한 뒤 인증 상태를 저장합니다. 이름·전화번호·CI 원문은 저장하지 않습니다. 계약 후 Supabase Edge Function 비밀값 `PORTONE_API_SECRET`, `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`를 설정해야 합니다. iOS에서는 인증 화면을 띄울 HTTPS 웹 주소를 `EXPO_PUBLIC_IDENTITY_WEB_URL`에 설정합니다. 제공업체 설정 전에는 실제 인증이 완료된 것으로 표시되지 않습니다. 자세한 흐름은 [PortOne V2 본인인증 문서](https://developers.portone.io/opi/ko/extra/identity-verification/readme-v2)를 따릅니다.

연결 순서와 정확한 콜백 주소는 [인증 업체 설정 문서](docs/AUTH_PROVIDER_SETUP.md)에 정리했습니다.

실제 소유 확인 요청은 서버 권한 정책에서 명의 확인 완료 계정만 제출할 수 있습니다. 무료 상담 접수는 명의 확인 없이도 가능합니다.

1. Supabase 프로젝트를 만들고 [schema.sql](supabase/schema.sql)을 SQL Editor에서 실행합니다.
2. `.env.local`에 프로젝트 URL과 **publishable key**를 넣습니다. Secret/service role key는 앱에 넣지 않습니다.
3. 인증 이메일 확인과 발송 설정을 검증합니다.
4. 운영팀 계정을 만든 뒤 `platform_staff`에 해당 `auth.users.id`를 SQL Editor에서 추가합니다.
5. 제휴처를 `organizations`에 추가하고 직원 계정을 `organization_members`에 연결합니다. 가입 화면만으로 제휴 권한이 생기지 않습니다.

```sql
insert into public.platform_staff (user_id) values ('운영자-user-uuid');
insert into public.organizations (name) values ('실제 계약된 보관처 이름') returning id;
insert into public.organization_members (org_id, user_id, role)
values ('위에서 받은-org-uuid', '직원-user-uuid', 'admin');
```

## iOS 배포 준비

`eas.json`에 개발·미리보기·스토어 빌드가 정의되어 있습니다. 스토어 빌드는 백엔드, 고유 번들 ID, 실제 개인정보 처리방침·약관·지원 URL이 없으면 설정 단계에서 멈추도록 했습니다. [출시 체크리스트](docs/APP_STORE_RELEASE.md)를 마친 뒤 `npx eas-cli@latest build --platform ios --profile production` 및 `npx eas-cli@latest submit --platform ios --profile production`을 실행합니다.

## 검증

- `npx tsc --noEmit`
- `npx expo lint`
- `npx expo install --check`
- `npx expo-doctor`
- `npx expo export --platform ios`
- `npx expo export --platform web`

실제 iOS 기기에서 지도 핀, 제휴처 위치 지정, 회원가입·삭제, RLS 권한, App Store 심사는 연결된 계정으로 별도 확인해야 합니다.

## 기획 근거

- [찾아줘 팀 허브](https://app.notion.com/p/f4f52f360e7f83c78e3681a7bbf63fc9): 빠른 실행, 데이터 보관, 서비스 개요
- [찾아줘 온보딩](https://app.notion.com/p/e6452f360e7f830d8b5a010471df199f): 지도, 제휴 매장 등록, 탐색·회수 이용자 상황
- [현 상황 제언](https://app.notion.com/p/5a752f360e7f831cbe4181341a9933f3): 배송 B2B2C 우선, 앱·탐색 기능은 검증 단계에 맞춰 작게 구현
- [분실물 배송 서비스 기획서](https://app.notion.com/p/e6352f360e7f83a9a88401a6a114b0e7): 보관처를 아는 고객과 제휴처의 업무 흐름
- [데이터 수집 및 분석 방안](https://app.notion.com/p/69552f360e7f834ea5be01a929c2fe93): 탐색형·회수형 구분, 최종 인도 추적

노션의 앱 개발 보류 제안은 현재 검증 단계의 우선순위이고, 이번 구현은 사용자의 명시적 앱 제작 요청에 따라 최소 범위로 진행했습니다. 노션 자료의 회수·배송 가격 및 수익 수치는 가설이므로 앱에서 확정 가격처럼 표시하지 않습니다.
