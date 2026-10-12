# C 백엔드 공통 기반

초기 작업은 Next.js 서버 설정·Supabase 연결·인증·프로필 처리를 준비했습니다. 2026-10-12 A의 공통 디자인과 layout·Header·Footer를 이어서 Provider·개인 상태 API·모바일 메뉴를 구현했습니다. 현재 범위와 남은 연결 검증은 [공통 레이아웃 기록](common-layout.md)을 참고합니다. 로그인 폼은 아직 별도 일감입니다.

## 실행

Node.js 24.x에서 프로젝트 루트에서 실행합니다.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`의 Supabase URL과 publishable key를 실제 개발 프로젝트 값으로 설정합니다. 연결 전에도 `http://localhost:3000/api/health`는 서버 실행 여부를 확인할 수 있습니다. 이 응답은 DB·Auth 연결 성공을 뜻하지 않습니다. 메인 `/`는 프론트 페이지를 추가하기 전까지 404가 정상입니다.

실제 키·비밀번호는 커밋하지 않습니다. 관리자 키는 사용하지 않습니다.

## Supabase 준비

2026-10-08 `.env.local` 연결과 실제 Supabase의 9개 테이블·RLS·B catalog seed 적용을 완료했습니다. 아래 단계 중 테이블 생성은 현재 공유 DB에서 다시 실행하지 않으며, 테스트 계정과 실제 로그인·프로필 연동 검증은 남아 있습니다. 적용 기록은 [DB 구성 안내](database.md)를 참고합니다.

1. 개발용 Supabase 프로젝트를 만들고 Auth에서 테스트 계정 2개를 준비합니다.
2. [DB 구성 안내](database.md)에 따라 프로필 → 공통 테이블 migration 순서로 적용합니다. 기존 테이블이 있다면 스키마·적용 이력을 비교한 뒤 변경 migration을 준비합니다.
3. `.env.local`을 설정하고 개발 서버를 재시작합니다.
4. 계정별 프로필 조회·변경이 분리되는지 실제 DB에서 확인합니다.

`profiles`는 본인만 조회·생성·수정할 수 있고, 닉네임은 2~20자입니다. 프로필이 없는 계정은 `getProfile()`에서 기본 닉네임으로 생성합니다. 회원가입 UI는 이번 작업에 포함하지 않습니다.

## 프론트에서 연결할 함수

| 함수                   | 파일                      | 사용 방식                                                           |
| ---------------------- | ------------------------- | ------------------------------------------------------------------- |
| `getCurrentUser()`     | `src/lib/auth.ts`         | 서버 컴포넌트에서 검증된 사용자 또는 `null` 조회                    |
| `requireUser(next?)`   | `src/lib/auth.ts`         | 개인 페이지·서버 요청에서 사용자 확인, 비로그인이면 로그인으로 이동 |
| `signIn(input)`        | `src/actions/auth.ts`     | `{ email, password, next? }` 제출                                   |
| `signOut()`            | `src/actions/auth.ts`     | 로그아웃 후 `/`로 이동                                              |
| `getProfile()`         | `src/services/profile.ts` | 서버 컴포넌트에서 본인 프로필 조회                                  |
| `updateProfile(input)` | `src/actions/profile.ts`  | `{ nickname }` 제출                                                 |

로그인·로그아웃 실패는 `{ ok: false, error: string }`으로 반환하고, 성공은 Next.js `redirect()`로 이동합니다. 프로필 저장 성공은 `{ ok: true }`를 반환합니다. `signIn`은 `FormData` 자체 대신 위 객체를 받으므로 폼에서 값을 추출해 전달합니다. 사용자 ID는 프론트에서 받지 않습니다.

헤더에서는 서버의 `getCurrentUser()` 결과를 props로 내려 로그인 여부를 표시합니다. 각 개인 페이지·Action은 헤더와 별도로 인증을 확인해야 합니다. 루트 layout만으로 개인 페이지를 보호하지 않습니다. 서버 조회 모듈은 클라이언트 컴포넌트에서 직접 import하지 않습니다.

인증·프로필 변경 뒤에는 공통 layout을 재검증합니다. 프론트에서 장바구니·찜 Context를 추가한다면 로그아웃·계정 변경 시 해당 상태를 초기화해야 합니다. 현재 Provider나 가짜 로그인 상태는 만들지 않았습니다.

`src/proxy.ts`와 `src/lib/supabase/session.ts`가 SSR 쿠키 세션을 갱신합니다. Supabase 설정이 없으면 공통 서버는 실행되지만 로그인은 실패 안내를 반환하며 성공으로 처리하지 않습니다.

## 검증

```powershell
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

자동 테스트는 외부 주소 이동 차단, 로그인 입력, 닉네임 검증·권한 필드 주입 차단과 로컬 PostgreSQL에서 공통 테이블 제약·두 계정 간 RLS를 확인합니다. 실제 Supabase 로그인·쿠키 만료 갱신·PostgREST 및 RLS 연동 검증은 프로젝트 연결 후 별도로 실행해야 합니다.

장바구니·찜·주문 테이블을 포함한 전체 스키마·제약·RLS는 C의 공통 migration으로 준비했습니다. A·B는 자기 테이블을 다시 만들지 않고 seed·조회 함수·화면을 구현합니다. 장바구니·찜·주문·모의 결제 처리 함수는 다음 구현 범위입니다.

## 공통 기반 완료 기록 — 2026-10-08

- 실제 Supabase에서 생성한 DB 타입을 `src/types/database.ts`에 저장하고 브라우저·서버·세션 클라이언트에 연결했습니다. 스키마 변경 후 Dashboard → Integrations → Data API → Docs의 Generate and download types로 다시 생성합니다.
- `202610080003_storage.sql`을 실제 프로젝트에 적용했습니다. `market-images`는 공개 서비스 이미지용 bucket이며 파일당 최대 5 MiB, JPEG·PNG·WebP·AVIF만 받습니다. 비로그인·일반 로그인 사용자의 업로드·수정·삭제를 restrictive RLS 정책 3개로 차단합니다. A·B는 권한 있는 Dashboard에서 이미지를 업로드합니다.
- `src/lib/storage.ts`의 `getImageUrl("products/example.webp")`로 DB 상대 경로를 공개 URL로 변환합니다. 이미지가 없으면 `null`을 반환하므로 프론트에서 placeholder를 표시합니다. `next.config.ts`는 설정된 Supabase 호스트의 해당 bucket만 `next/image`에 허용합니다. 실제 이미지 파일은 아직 업로드하지 않았습니다.
- Tailwind PostCSS와 `src/app/globals.css`를 준비했습니다. 상재님이 만드는 `src/app/layout.tsx`에 `import "./globals.css";`를 추가합니다. 디자인 규칙·Header·Footer·메뉴·Provider는 별도 프론트 일감입니다.
- 비밀값과 기존 node_modules를 복사하지 않은 새 임시 폴더에서 `npm ci` → `npm run build` → `npm run start -- --port 3101`을 검증했습니다. 프론트가 아직 없으므로 검증 폴더에만 최소 layout/page를 추가했습니다. Tailwind `p-4` CSS 생성, 검증 페이지와 `/api/health` HTTP 200을 확인했습니다. 저장소에는 검증용 화면을 추가하지 않았습니다.
- 자동 테스트 13개·타입 검사·lint가 통과했습니다. 로컬 PostgreSQL 테스트에는 Storage 쓰기 차단도 포함합니다. `.env.local`은 Git 제외를 확인했습니다. 실제 사용자 로그인·세션·두 계정 연동 검증은 인증 일감에서 진행합니다.

이 기록은 공통 기반 일감의 설치·연결·환경변수·타입·Storage·DB 적용 순서 완료 증빙입니다. 전체 서비스나 공통 레이아웃 일감의 완료를 의미하지 않습니다.

설치 시 npm audit에서 ESLint 개발 의존성의 `braces` 취약점이 보고됐습니다. 확인한 최신 `braces` 3.0.3에도 수정 버전이 없으므로 Next.js 설정을 구버전으로 강제 변경하지 않았습니다. 운영 의존성 검사와 구분하고 수정 버전이 나오면 개발 의존성을 갱신합니다.

참고: [Supabase SSR 공식 문서](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [Next.js 설치 공식 문서](https://nextjs.org/docs/app/getting-started/installation).
