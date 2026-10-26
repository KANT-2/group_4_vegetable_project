# 관리자 화면 로컬 확인

- 로그인: `/admin/login`, 상품 관리: `/admin`.
- 로컬 개발 서버의 기본 계정은 `admin` / `admin1234`입니다. 이 기본 계정은 production에서는 작동하지 않습니다.
- 배포 시에는 최상위 환경 설정에 `ADMIN_LOGIN_ID`, `ADMIN_LOGIN_PASSWORD`, 충분히 긴 임의 값의 `ADMIN_SESSION_SECRET`을 별도로 설정해야 합니다. 실제 값은 Git에 올리지 않습니다.
- 아이디 로그인은 서버에서 확인하고 1시간짜리 HttpOnly 세션 쿠키를 발급합니다. 로컬 서버 재시작 시 세션이 초기화될 수 있습니다.
- Google 로그인은 기존 Supabase OAuth를 사용합니다. 최상위 Supabase URL·Publishable Key·사이트 URL 및 Google 제공자와 callback 설정이 필요합니다.
- Google 계정은 신뢰된 서버 또는 Supabase 관리 도구에서 `app_metadata.role`이 `admin`으로 지정되어야 관리자 페이지에 접근할 수 있습니다. 사용자 수정이 가능한 `user_metadata`는 권한 판단에 사용하지 않습니다. 이 권한 기준은 지나 담당 공통 인증과 통합 시 조율해야 합니다.
- 로그아웃은 관리자 세션 및 현재 Supabase 로그인 세션을 종료합니다.
- 현재 상품 수정은 화면 메모리에만 반영됩니다. 실제 상품 DB 저장 API는 아직 연결하지 않았습니다.
- 현재 아이디 로그인은 로컬 시안 확인을 위한 구성입니다. 공개 서비스 적용 전에는 공통 인증과 로그인 시도 제한 등을 통합해야 합니다.
