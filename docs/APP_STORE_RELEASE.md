# App Store 출시 체크리스트

## 구현된 항목

- iOS 앱 설정과 업로드한 1024px 로고
- Apple 지도 기반 습득물 표시 (사용자 GPS 권한 요구 없음)
- 이메일 계정, 앱 내 계정 삭제, 제휴처·운영자 권한 분리
- 습득물 검토 후 공개, 신고 및 보관처 숨기기
- 결제 전 비용 미확정·상담 무료 고지, 공식 LOST112 연결

## 실제 출시 전에 필요한 입력과 검증

1. **운영 주체와 연락처:** 사업자/팀의 실제 명칭, 고객 지원 채널, 응답 방식 확정.
2. **정책 URL:** 실제 개인정보 처리방침, 이용약관, 고객 지원 페이지를 HTTPS로 게시하고 `.env.local`/EAS 환경에 `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_URL` 설정. 정책에는 수집 항목, 처리 목적, 보유·삭제 기간, 제휴처/수탁자 역할, 문의처가 실제 운영과 맞게 적혀야 합니다.
3. **백엔드:** 연결된 Supabase 프로젝트에 스키마를 적용했습니다. 실제 이용자·제휴처·운영자 계정으로 RLS를 검증하고, 실제 계약된 제휴처만 `organization_members`에 추가해야 합니다.
4. **운영 절차:** 게시물 승인, 신고 대응, 소유 확인, 귀중품/신분증/금지물품 처리, 경찰·건물 관리자 인계, 기록 삭제 절차를 확정. 제휴처 1곳 이상과 운영 책임 범위를 합의.
5. **Apple 계정:** Apple Developer Program과 App Store Connect 앱 생성, 고유 `IOS_BUNDLE_IDENTIFIER`, App Store 개인정보 라벨, 지원/개인정보 URL, 스크린샷, 설명, 연령 등급, 심사용 이용자·제휴처·운영자 계정 제공.
6. **기기 검증:** 실제 iPhone에서 지도, 등록, 로그인/이메일 확인, 권한, 소유 요청, 계정 삭제를 확인. TestFlight에서 외부 테스트 후 심사 제출.
7. **법률/결제:** 현재 앱은 결제와 배송을 수행하지 않습니다. 실제 유료 서비스는 가격·취소·환불, 운송 책임, 본인 확인과 개인정보 위탁 구조를 확정한 뒤 추가합니다.
8. **의존성 보안 점검:** 현재 `npm audit --omit=dev`가 Expo/Metro 및 라우터의 간접 의존성 경고 29건(높음 19건 포함)을 보고합니다. 자동 `--force` 수정은 SDK를 호환되지 않는 버전으로 바꾸므로 적용하지 않았습니다. 출시 전에 호환되는 보안 업데이트를 재확인합니다.

설정 후: `npx eas-cli@latest login`, `npx eas-cli@latest init`, `npx eas-cli@latest build --platform ios --profile production`, `npx eas-cli@latest submit --platform ios --profile production`.

App Store Connect 심사 메모에는 체험 데이터와 실제 데이터 구분, 제휴처 등록이 운영자 승인 후 공개되는 흐름, 계정별 데모 로그인 방법을 적습니다.
