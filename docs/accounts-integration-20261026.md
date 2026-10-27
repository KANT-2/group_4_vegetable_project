# 회원·인증·마이페이지 구현 및 통합 요청

작성: 지나, 2026-10-26
상태: **기능·화면 연결·팀 DB 종단 간 검증 완료, 공통 `main.py` 등록 완료**

## 1. 구현 범위

- Argon2 비밀번호 해싱·검증
- JWT 발급·검증 (`sub`, `role`, `jti`, `iat`, `exp`, `type`)
- 로그인 및 토큰 블랙리스트 로그아웃
- 비활성 사용자·만료·변조·로그아웃 토큰 차단
- `get_current_user`, `require_admin` 공통 인증 의존성
- 내 계정·닉네임·기본 배송지 조회 및 수정
- `app_users`, `profiles`, `revoked_tokens` ORM·Repository·트랜잭션 초안
- 개발용 일반 사용자·관리자 계정 생성 스크립트
- 아이디 또는 이메일 로그인
- 일반 회원가입과 관리자 가입 신청(승인 전 비활성)
- 고객·관리자 로그인 화면의 FastAPI JWT 연결

Google 로그인과 비밀번호 변경은 이번 필수 범위에서 제외한다.

## 2. API 규격

| Method | Path                                   | 인증   | 설명                                               |
| ------ | -------------------------------------- | ------ | -------------------------------------------------- |
| POST   | `/api/v1/accounts/register`            | 없음   | 일반 회원가입                                      |
| POST   | `/api/v1/accounts/admin-registrations` | 없음   | 관리자 가입 신청(승인 전 로그인 불가)              |
| POST   | `/api/v1/accounts/login`               | 없음   | OAuth2 form의 `username`에 아이디 또는 이메일 전달 |
| POST   | `/api/v1/accounts/logout`              | Bearer | 현재 JWT의 `jti`를 차단 목록에 저장                |
| GET    | `/api/v1/accounts/me`                  | Bearer | 내 계정·프로필·배송지 조회                         |
| PATCH  | `/api/v1/accounts/me/profile`          | Bearer | `{ "nickname": "새닉네임" }` 수정                  |
| GET    | `/api/v1/accounts/me/address`          | Bearer | 기본 배송지 조회, 미등록 시 404                    |
| PUT    | `/api/v1/accounts/me/address`          | Bearer | 기본 배송지 전체 저장                              |

로그인 성공 응답:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

배송지 요청 필드:

```json
{
  "recipient_name": "김지나",
  "recipient_phone": "01012345678",
  "postal_code": "12345",
  "address": "서울시 중구 세종대로 1",
  "address_detail": "101호"
}
```

모든 마이페이지 수정 API는 클라이언트의 사용자 ID를 받지 않고 JWT의 `sub`만 사용한다.

## 3. 공통 파일 통합 결과

`backend/app/main.py`에 다음 계정 라우터가 등록되었다.

```python
from app.presentation.accounts.router import router as accounts_router

app.include_router(accounts_router, prefix="/api/v1")
```

체험과 구매 API도 같은 인증 의존성의 JWT 사용자 ID와 역할을 사용한다.

## 4. 체험 예약 임시 인증 교체 요청

현재 `backend/app/presentation/experiences/dependencies.py`에는 JWT만 확인하고 블랙리스트는 검사하지 않는 임시 인증이 있다. 통합 시 아래 항목을 지나 공통 인증으로 교체한다.

```python
from app.presentation.accounts.dependencies import (
    CurrentUser,
    get_current_user,
    require_admin,
)
```

- 체험 모듈의 임시 `CurrentUser`, `oauth2_scheme`, `get_current_user`, `require_admin` 제거
- 서비스 조립용 `get_service`는 유지
- 로그아웃된 토큰도 체험 예약 API에서 401이 되는지 통합 테스트 추가

이 변경은 형준 담당 파일이므로 형준님이 통합하거나 별도 승인 후 수정한다.

## 5. DB 마이그레이션 주의사항

초안: `docs/sql-drafts/202610260001_accounts.sql`

초안이 하는 일:

- `app_users`, `revoked_tokens` 생성
- 민감 테이블의 브라우저 직접 접근 차단

아직 하지 않는 일:

- `profiles`, `cart_items`, `wishlist_items`, `orders`, `user_coupons` 외래키 변경
- `auth.uid()` 기반 RLS·RPC 교체
- 기존 Supabase Auth 사용자의 자동 이전

현재 `profiles.id`는 `auth.users(id)`를 참조하므로 FastAPI 전용 사용자의 마이페이지를 실제 DB에서 저장할 수 없다. 위 항목은 서현·영우·형준과 사용자 식별자 통합 방식을 합의한 후 별도 마이그레이션으로 처리한다. 현재 SQL을 팀 DB에 임의로 적용하지 않는다.

## 6. 합의 후 적용·계정 생성 절차

```powershell
cd C:\dev\group_4_vegetable_project\backend
.\.venv\Scripts\Activate.ps1

# 팀 확인 후 SQL을 정식 migration으로 옮기고 형준님 절차로 적용

# 일반 사용자
python -m scripts.create_user `
  --email jina@test.com `
  --password "test1234!" `
  --nickname "지나" `
  --role user

# 관리자 사용자는 --role admin
```

비밀번호, JWT 비밀 키, DB 주소는 문서·채팅·Git에 기록하지 않는다.

## 7. 환경변수

`backend/.env`에 다음 값이 필요하다.

```dotenv
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET_KEY=충분히_긴_임의의_비밀값
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

`JWT_SECRET_KEY`가 없으면 인증 의존성은 503을 반환한다.

## 8. 검증 현황

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

- 로컬 전체 백엔드: `332 passed, 53 skipped` (DB 환경 없이 실행한 결과)
- 팀 DB 통합: 기존 장바구니·주문·공통 오류·체험 테스트 `53 passed`
- 회원 전용 팀 DB 종단 간 테스트 `2 passed` (`backend/tests/test_accounts_db.py`)
- 일반 회원가입 → 아이디 로그인 → 내 정보 조회 → 닉네임·배송지 수정 → 재조회 성공
- 잘못된 로그인 401, 사용자 ID 주입 422, 일반 회원의 관리자 API 403
- 로그아웃 후 같은 JWT로 `/accounts/me` 재요청 시 401
- 관리자 가입 신청은 `pending`으로 저장되고 승인 전 로그인은 401
- 테스트 계정은 `test-account-`·`test-admin-` 전용 이메일만 사용하고 종료 시 삭제

## 9. 통합 완료 조건

1. [완료] 계정 마이그레이션 적용 및 공통 UUID 사용
2. [완료] 개발용 일반 사용자·관리자 계정 생성 절차
3. [완료] `accounts_router` 등록
4. [완료] 로그인 → 내 정보 조회 → 배송지 수정 → 재조회
5. [완료] 로그아웃 → 동일 JWT로 `/accounts/me` 요청 시 401
6. [완료] 일반 사용자로 관리자 API 요청 시 403
7. [완료] 체험 예약 API에서도 로그아웃 토큰 401
8. [완료] 프론트 로그인·회원가입·마이페이지·관리자 로그인 연결

Google OAuth는 팀 결정대로 필수 범위에서 제외하며, 운영용 관리자 승인은 신뢰된 운영자가 신청을 검토한 뒤 수행한다.
