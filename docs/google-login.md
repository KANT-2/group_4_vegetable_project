# C #12 Google 로그인·세션·개인 권한

작업일: 2026-10-12 / 담당: C 이상재 / 상태: Google 연결·실제 로그인·새로고침 세션 유지·로그아웃 검증 완료. 두 실제 계정 전환 검증은 남아 있습니다.

사용자 요청으로 Google 로그인까지 범위를 확장했습니다. 별도 비밀번호 회원가입 화면은 만들지 않습니다. 처음 Google 인증을 마치면 Supabase Auth 계정이 생성됩니다.

## 구현

- `/login`: A의 공통 디자인으로 Google 로그인 화면, 처리 중 중복 클릭 차단, 취소·오류 안내, 로그인 없이 둘러보기.
- Google 연결 설정을 공개 Auth settings에서 확인합니다. provider 미설정 상태에서는 버튼을 비활성화하고 준비 중으로 표시합니다. 직접 Action을 호출해도 미설정 상태를 성공으로 처리하지 않습니다.
- `signInWithGoogle`: 서버에서 OAuth 시작, scopes는 openid·email·profile, 계정 선택 화면 사용. Google Client Secret은 앱에 넣지 않습니다.
- `/auth/callback`: PKCE 코드 교환 후 SSR 쿠키에 세션 저장, 본인 프로필 준비. 프로필 준비 실패 시 새 세션을 정리하고 실패 안내로 복귀합니다.
- 콜백은 NEXT_PUBLIC_SITE_URL의 고정 origin으로만 복귀합니다. Host·경로 검증, 외부 next·인증 경로 루프 차단, private/no-store를 적용합니다.
- proxy에서 `/cart`·`/mypage`와 하위 경로의 실제 사용자를 확인하고, 비로그인은 `/login?next=...`로 안내합니다. 개인 조회·변경 함수에서도 requireUser·RLS를 유지합니다. proxy만으로 DB 변경 권한을 판단하지 않습니다.
- 기존 Header의 로그인·로그아웃과 NavigationProvider를 연결합니다. 로그아웃 후 본인 상태·장바구니 숫자를 초기화하며 실패 시 오류를 표시합니다.

## Google Cloud·Supabase 설정 순서

Google Cloud `motnani-story` 프로젝트의 앱 이름은 못난이이야기이며 외부·테스트 모드로 구성했습니다. OAuth 웹 클라이언트를 발급해 실제 Supabase `vegetable` 프로젝트에 등록했고 Google provider를 활성화했습니다. Client Secret은 Supabase 설정에만 저장하며 앱 환경변수나 저장소에 넣지 않습니다.

승인된 JavaScript 원본은 `http://localhost:3000`, `http://127.0.0.1:3103`입니다. Supabase 반환 주소는 두 원본 각각의 `/auth/callback`과 `/auth/callback?**`를 등록해 로그인 후 이동 경로를 허용합니다. Site URL은 `http://localhost:3000`이며 검증 서버에는 `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3103`을 명시했습니다. nonce 검사 생략과 이메일 없는 계정 허용은 비활성 상태를 유지했습니다.

1. Google Cloud에서 프로젝트를 생성합니다. 결제 연결이나 유료 서비스를 사용하지 않습니다.
2. Google Auth Platform의 앱 이름은 못난이이야기로 설정합니다. External·Testing으로 시작하고 필요한 테스트 계정을 등록합니다. 앱 인증·전체 사용자 공개는 별도 작업입니다.
3. 기본 범위는 openid·email·profile입니다. Google API 데이터나 오프라인 토큰 접근을 추가하지 않습니다.
4. OAuth 웹 애플리케이션 Client를 만듭니다. Authorized redirect URI는 `https://cfbssdrcqedydgefotxk.supabase.co/auth/v1/callback`입니다. 앱의 `/auth/callback`과 다릅니다.
5. 발급한 Client ID·Secret을 Supabase 프로젝트의 Google provider 설정에 등록하고 활성화합니다. 비밀값은 채팅·Git·로그·캡처에 기록하지 않습니다.
6. Supabase URL Configuration에는 실제 앱 Site URL과 앱 callback 허용 URL을 등록합니다. 로컬 기본값은 `http://localhost:3000`, 앱 callback은 `http://localhost:3000/auth/callback`입니다. 현재 검증 서버는 `http://127.0.0.1:3103`과 해당 `/auth/callback`을 사용합니다.
7. `.env.local`의 NEXT_PUBLIC_SITE_URL과 접속 origin을 정확히 맞춥니다. 운영에서는 실제 HTTPS 배포 URL을 사용합니다. 광범위한 wildcard는 등록하지 않습니다.
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`이면 브라우저에서도 `http://localhost:3000`으로 접속해야 합니다. `http://127.0.0.1:3000`은 같은 PC라도 다른 호스트여서 콜백 Host 검증이 실패하며, 인증 쿠키도 공유되지 않습니다.
   - `127.0.0.1`로 검증하려면 NEXT_PUBLIC_SITE_URL과 Supabase callback 허용 주소를 해당 호스트·포트로 맞추고 서버를 다시 실행합니다. Host 비교를 느슨하게 바꾸지 않습니다.
8. 실제 계정으로 로그인·새로고침 유지·로그아웃을 검증합니다. 계정별 데이터 분리는 DB RLS 자동 테스트로 검증하며, 실제 두 Google 계정 전환은 팀원이 본인 계정으로 참여할 때 추가 확인합니다. 테스트를 위해 새 계정을 만들 필요는 없습니다.

OAuth 클라이언트 발급·Supabase 인증정보 저장·Google provider 활성화·콜백 허용·실제 계정 동의는 각 실행 단계에서 사용자 승인을 받고 진행했습니다.

## 검증

- 단위·DB 테스트 19개 통과: 외부 이동·인증 루프·잘못된 origin·개인 경로 구분, 기존 RLS·계정별 데이터 분리 포함.
- 타입 검사·lint 통과.
- `node scripts/check-login.mjs http://127.0.0.1:3103`: 비로그인 개인 경로 차단, 외부 next와 잘못된 OAuth 코드 실패, 캐시 차단 검증.
- 리뷰 수정 후 Supabase URL·공개 키를 비운 Mock 서버에서도 `check-login.mjs`가 통과했습니다. 환경변수가 없는 개인 경로 redirect에도 `Cache-Control: private, no-store`를 적용합니다.
- Google provider 미설정 로그인 화면·안내 확인 후, 실제 활성화된 Google 로그인 버튼에서 계정 선택·동의·PKCE 콜백·홈 복귀를 검증했습니다.
- 실제 계정의 `새싹회원` 프로필 표시, 새로고침 후 세션 유지, 로그아웃 후 개인 표시 제거를 확인했습니다. 두 실제 계정 전환은 아직 미검증입니다.
- 실제 본문 DB에는 A의 recipes.source_url 컬럼이 아직 없어 화면 검증 시만 USE_MOCK_DATA=true를 명시합니다. 인증·개인 상태는 Mock 계정으로 우회하지 않습니다.

참고: [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
