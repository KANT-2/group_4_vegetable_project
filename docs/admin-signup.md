# 관리자 가입 신청

기존 Supabase Auth를 사용하는 관리자 전용 가입 흐름입니다. 고객용 FastAPI accounts 구현과는 별도이며, 사용자 자동 이전은 하지 않습니다.

## 활성화 준비

1. 팀 DB 담당자 검토 후 `supabase/migrations/202610250002_admin_registrations.sql`을 적용합니다. Auth 생성 트랜잭션에 관리자 신청 행을 넣는 트리거가 포함되어 있으므로 공유 DB에는 검토 후 적용합니다.
2. Next.js 서버의 환경변수에 `SUPABASE_SERVICE_ROLE_KEY`를 설정합니다. `NEXT_PUBLIC_` 접두어를 붙이지 않습니다. 브라우저나 Git에 키를 넣지 않습니다. 기존 Supabase URL·publishable key와 같은 프로젝트의 키를 사용합니다.
3. Supabase에서 이메일 인증을 켜고 SMTP·전송 한도·비밀번호 정책을 설정합니다. 권장: 최소 12자, 유출 비밀번호 차단, CAPTCHA/인증 요청 속도 제한.
4. Google 제공자에 OAuth 클라이언트를 설정합니다. Supabase의 콜백 주소를 Google 허용 주소에 등록하고 앱의 `/auth/callback`을 Supabase redirect allowlist에 등록합니다. `NEXT_PUBLIC_SITE_URL`은 실제 앱 주소와 맞춥니다.
5. 서버를 다시 시작합니다. 운영 환경에는 임시 로그인 대신 승인된 계정을 사용합니다.

## 가입·권한

- 일반 가입: 아이디·비밀번호·재확인·이름·이메일 모두 필수. 이메일 인증 후 승인 대기.
- Google: 기존 PKCE OAuth → `/admin/signup/complete`에서 아이디·이름 확인. 이메일은 인증된 Google 사용자 정보에서 서버가 가져옵니다. 비밀번호를 수집하지 않습니다.
- 비밀번호 평문을 앱 DB에 저장하지 않습니다. Supabase Auth가 비밀번호 인증을 처리합니다.
- 아이디는 공백 없는 ASCII 영문·숫자·기호 4~40자, 비밀번호는 동일 문자 범위 12~128자. 모든 문자 종류를 반드시 섞어야 한다는 의미는 아닙니다.
- DB의 `lower(username)`와 `lower(trim(email))` UNIQUE가 동시 요청의 중복도 차단합니다. 이름에는 UNIQUE가 없습니다. 생성 트리거 실패 시 Auth 생성도 롤백됩니다.
- Google/이메일은 Supabase의 동일 이메일 신원 연결 정책을 따릅니다. 같은 사용자 UUID의 가입 신청을 추가할 수 없습니다.
- 누구나 신청할 수 있지만 자동으로 관리자가 되지는 않습니다. 신뢰된 운영자가 이메일 확인 후 신청의 `status`를 `approved`로 바꾸고 Supabase Auth Admin API에서 `app_metadata.role='admin'`을 부여해야 합니다. 가입 요청의 사용자 메타데이터를 권한으로 사용하지 않습니다.
- 아이디 로그인은 서버 전용 키로 이메일을 찾은 뒤 Supabase 비밀번호 인증과 승인 상태·관리자 role을 확인합니다.
- 비밀번호 로그인 기존 개발용 환경변수 계정은 별도로 유지됩니다. 운영에서는 기본 admin/admin1234가 동작하지 않습니다.

## 검증 범위

`node --test tests/admin-signup.test.mjs`는 로컬 PostgreSQL 호환 PGlite에서 고유 제약, 같은 이름 허용, 실패 시 롤백, 비공개 테이블 접근 차단을 확인합니다. 실제 이메일 전송·Google OAuth·운영 DB 가입은 위 설정 후 별도로 검증해야 합니다.
