# 4조 백엔드 공통 환경 구성 (2026-10-23)

작성: 형준(PM·공통 통합). 이 문서의 "구현됨"은 **로컬에서 실행해 확인한 것**만 뜻합니다. 새 Supabase/PostgreSQL에는 아직 연결하지 않았으므로 DB 연결은 **미검증**입니다. 기존 README의 이전 배포·검증 기록은 4조의 검증 결과가 아닙니다.

## 1. 실행 방법

```bash
# 백엔드 (Python 3.13+, uv 필요)
cd backend
cp .env.example .env        # 값은 직접 입력, 채팅·Git 공유 금지
uv sync
uv run uvicorn app.main:app --reload --port 8000
uv run pytest -q

# 프론트
cp .env.example .env.local
npm install && npm run dev
```

`DATABASE_URL`이 비어 있어도 서버는 켜지고 `/health/db`는 `not_configured`를 돌려줍니다.

## 2. 환경변수와 책임

| 위치              | 변수                                                                                       | 용도                                                        | 비밀 여부 |
| ----------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------- |
| 루트 `.env.local` | `NEXT_PUBLIC_API_BASE_URL`                                                                 | 프론트가 호출할 FastAPI 주소 (기본 `http://localhost:8000`) | 공개값    |
| 루트 `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` | 기존 Supabase 화면용(유지 여부 미결정)                      | 공개값    |
| 루트 `.env.local` | `USE_MOCK_DATA`                                                                            | 선택. Mock 표시이며 DB 연결 성공이 아님                     | -         |
| `backend/.env`    | `DATABASE_URL`                                                                             | `postgresql+asyncpg://…` 형식 필수                          | **비밀**  |
| `backend/.env`    | `JWT_SECRET_KEY` (+ `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`)                    | JWT 서명                                                    | **비밀**  |
| `backend/.env`    | `CORS_ALLOW_ORIGINS`                                                                       | 쉼표 구분, `*` 금지                                         | 공개값    |
| `backend/.env`    | `APP_ENV`                                                                                  | local/test/production                                       | -         |

`NEXT_PUBLIC_` 변수에는 비밀번호·서비스 역할 키·JWT 비밀 키를 넣지 않습니다. 이전 팀 프로젝트의 비밀값은 재사용하지 않습니다.

## 3. 만든 파일과 소유권

- `backend/pyproject.toml`: uv, Python ≥3.13, FastAPI·SQLAlchemy async·asyncpg·pydantic-settings·pyjwt·pwdlib(argon2). 의존성 추가는 PR에서 서로 알립니다.
- `backend/app/main.py`, `core/config.py`, `core/logging.py`: 형준. 앱 팩토리, lifespan(엔진 생성·종료), CORS, 처리 시간 로깅(경로·상태·시간만 기록), `/health`, `/health/db`.
- `backend/app/core/database.py`: 비동기 엔진·세션 **초안**. 영우 담당 제안 파일이라 영우가 작업 중이면 영우 버전으로 교체합니다(영우 원격 브랜치에는 아직 변경 없음을 확인했습니다).
- `backend/app/{presentation,application,domain,infrastructure}/{accounts,catalog,purchases,experiences}/__init__.py`: accounts=지나, catalog=서현, purchases=영우, experiences=형준. 공용 router/service/models 파일은 만들지 않았습니다.
- 라우터 등록은 담당자가 PR 설명에 한 줄로 요청하고, 형준이 `main.py`에 모아 반영합니다(공통 파일 충돌 방지). prefix는 `/api/v1/<기능>`. 구조는 `backend/app/`로 통일하고 `backend/src/`는 만들지 않습니다.
- JWT·인증 의존성은 지나가 `accounts/`와 공통 인증 모듈로 구현합니다(아직 없음).

## 4. 기존 Supabase 의존성 목록

- 인증: `signInWithPassword`, `signInWithOAuth`(Google), `signOut`, `getUser`, `exchangeCodeForSession` (`src/actions/auth.ts`, `src/lib/supabase/session.ts`, `src/lib/auth.ts`, `src/app/auth/callback/route.ts`)
- 테이블(`.from`): profiles, vegetables, products, recipes, cart_items, wishlist_items, orders, order_items, refund_requests, coupon_campaigns, user_coupons (recipe_products는 마이그레이션에만 있음)
- RPC: `mock_checkout`(주문·모의 결제), `claim_coupon`
- Storage: 버킷 `market-images` (`next.config.ts` 이미지 허용 도메인과 마이그레이션 `…0003_storage.sql`)
- RLS 정책: profiles·장바구니·찜·주문·환불·쿠폰 등. 마이그레이션 `supabase/migrations/*.sql`(14개), 시드 `supabase/seeds/*.sql`(catalog, recipes, verified-recipes)
- 새 URL만 바꿔도 테이블·이미지·사용자는 자동 이전되지 않습니다. 새 프로젝트에 위 마이그레이션과 시드를 순서대로 적용하고, 이미지 파일과 Auth 설정은 따로 준비해야 합니다.

과제 요건상 이 Supabase 호출을 FastAPI 직접 구현으로 간주하지 않습니다. 각 담당 기능은 FastAPI·SQLAlchemy로 새로 구현합니다.

## 5. 새 Supabase/DB 준비 순서

진행 상태: 1~5 완료(2026-10-23), 6(Google 로그인)만 남음. 적용 명령은 `cd backend && PYTHONPATH=. uv run python scripts/apply_sql.py migrations` 후 `seeds`. 이 스크립트는 public에 테이블이 있거나 products에 데이터가 있으면 중단하며, 삭제·초기화는 하지 않습니다. 이미지는 시드가 참조하는 `products/`·`vegetables/` 경로 92개를 `public/images`에서 모아 대시보드 Storage에 올렸습니다.

1. 4조 새 Supabase 프로젝트 존재 여부 확인 및 생성 — 형준
2. DB 연결 문자열 확보(Session pooler 권장) 후 각자 `backend/.env`에 직접 입력 — 전원
3. 마이그레이션 적용: 스키마·RLS·함수. 재실행 가능 여부 점검 후 4조 DB에만 적용 — 형준 확인, 테이블 소유자별 검토
4. 시드: `catalog.sql` 등 — 서현(상품), 영우(구매 관련 확인), 형준(체험 시드 신규)
5. Storage 버킷 `market-images` 및 이미지 업로드 — 서현·형준
6. Google 로그인 유지 여부 결정 후 OAuth 클라이언트·리디렉션 설정 — 지나
7. 공유·원본 DB에 reset/drop/무조건 시드 실행 금지

## 6. 공통 규격 (제안 — 팀 합의 필요)

- API prefix `/api/v1`, 오류는 FastAPI 기본 `{"detail": …}` 형식, 목록은 `page`·`size` 쿼리와 `{items, total, page, size}` 응답.
- 인증은 `Authorization: Bearer <JWT>`. 사용자 ID·관리자 역할 클레임명, 상품 참조(ID 형식), 배송지 형식은 지나·서현·영우와 합의 후 확정.

## 7. 검증 상태

| 항목                                                                                                          | 상태                   |
| ------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `uv sync`, `uv run pytest` (5건: health, DB 미설정 응답, CORS 허용/차단, asyncpg 주소 강제, `*` 거부)         | 로컬 통과              |
| uvicorn 실행, `/health`·`/health/db`·CORS 헤더·처리 시간 로그                                                 | 로컬 확인              |
| 4조 새 Supabase(Session pooler)에 asyncpg 연결 (`select 1`)                                                   | 로컬 확인 (2026-10-23) |
| 마이그레이션 13개 적용 (`backend/scripts/apply_sql.py migrations`) → public 테이블 12개, 버킷 `market-images` | 로컬 확인              |
| 시드 적용 (`apply_sql.py seeds`) → vegetables 21, products 71, recipes 23, recipe_products 115                | 로컬 확인              |
| Storage 이미지 92개(products 71, vegetables 21) 대시보드 업로드, 공개 URL 200 응답                            | 확인                   |
| lifespan 종료 시 풀 정리                                                                                      | **미검증**             |
| 프론트 ↔ FastAPI 호출, 기존 Next.js 빌드·실행                                                                 | **미검증**             |
| 인증·JWT·블랙리스트 등                                                                                        | 미구현                 |

## 8. 다른 문서와 차이 (영우와 범위 공유 필요)

`docs/team-workflow-20261023.md`와 README는 서현 브랜치를 `seohyun`으로, 승인을 "다른 팀원 1명"으로, 보호 규칙을 미적용으로 적고 있으나 실제는 `seohyeon`, group-4-pm 팀 승인 필수, 보호 규칙 적용 상태입니다. 영우 문서이므로 이 PR에서는 수정하지 않았습니다.
