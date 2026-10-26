# 4조 API 약속 (초안 — 팀 합의 전)

작성: 형준, 2026-10-23. **제안 상태이며 확정이 아닙니다.** 팀 4명이 확인하면 "확정"으로 표시하고 변경은 PR로만 합니다. 아래 DB 사실은 새 Supabase(2026-10-23)에서 조회한 실제 스키마 기준입니다.

## 0. 먼저 정해야 할 것: 사용자 식별 (지나 주도)

실제 스키마 사실:

- `profiles.id`, `cart_items.user_id`, `wishlist_items.user_id`, `orders.user_id`, `user_coupons.user_id`가 모두 `auth.users(id)`를 **외래키로 참조**합니다(`on delete cascade`).
- 과제 요건상 비밀번호 해싱·JWT 발급·검증·블랙리스트는 FastAPI가 직접 구현해야 하므로, Supabase Auth 사용자만으로는 요건을 채울 수 없습니다.

| 안           | 내용                                                                                                                                                    | 장점                                       | 영향                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| A            | FastAPI가 Supabase `auth.users`를 그대로 사용(Supabase JWT 검증만)                                                                                      | 외래키 변경 없음                           | 로그인·해싱·JWT 발급을 직접 구현했다고 볼 수 없음 → **요건 미충족 위험**                                                          |
| **B (제안)** | `public.app_users`(uuid PK, email, password_hash, role, `supabase_user_id` null 허용) 신설. 위 외래키 5곳을 `app_users(id)`로 교체하는 마이그레이션 1개 | 요건 충족, 사용자 ID·role을 FastAPI가 소유 | 외래키 교체는 영우·서현·지나 테이블에 닿으므로 **합의 후 한 번에 적용**. 기존 Supabase 로그인 화면은 FastAPI 로그인으로 교체 필요 |

기존 Supabase 사용자의 자동 이전은 하지 않습니다(새 프로젝트라 사용자 없음). Google 로그인은 B안에서는 별도 구현이 필요해 이번 필수 범위에서 제외할지 정합니다.

## 1. 인증 규격 (B안 기준)

- 전달: `Authorization: Bearer <access_token>`, 로그인은 OAuth2 password flow(`POST /api/v1/accounts/login`, form).
- 토큰 클레임: `sub`=사용자 UUID 문자열, `role`=`user`|`admin`, `jti`=블랙리스트용 고유 ID, `exp`.
- 로그아웃: `jti`를 블랙리스트에 저장, 같은 토큰 재사용 시 401.
- 공통 의존성(지나 소유): `get_current_user`(인증 실패 401), `require_admin`(권한 부족 403). 각자 자기 API의 **소유권 검사**는 직접 구현.
- 상태 코드: 입력 오류 422, 인증 없음/만료/로그아웃된 토큰 401, 권한 없음 403, 없음 404, 규칙 위반(정원 초과·중복) 409.

## 2. 상품 참조 (서현·영우)

- `products.id`는 **text**(uuid 아님). 예: `carrot-1`류 문자열. API에서도 문자열로 주고받습니다.
- 판매 상태: `products.is_active`(false면 주문 불가). 판매 종료 상품은 목록 API 기본 제외 여부를 서현이 정합니다.
- 가격은 `products.price`(정수, 원). 주문은 클라이언트 금액을 믿지 않고 서버가 `price × quantity`와 배송비로 계산합니다.
- 주문 당시 값은 `order_items`(product_id text, product_name, product_unit, unit_price, quantity)에 복사 저장합니다(이미 스키마에 있음).

## 3. 배송지 (지나·영우)

- 기본 배송지는 `profiles`의 `recipient_name, recipient_phone, postal_code, address, address_detail`.
- 주문 당시 배송지는 `orders`의 같은 5개 컬럼에 복사해 저장(이미 스키마에 있음). 이후 프로필을 바꿔도 주문은 변하지 않음.
- B안이면 이 컬럼이 `profiles`에 남을지 `app_users` 쪽으로 옮길지 지나가 정합니다.

## 4. API 공통 형식

- 주소: `/api/v1/<기능>/...` (accounts, catalog, purchases, experiences).
- 오류 본문: `{"detail": "사람이 읽는 메시지"}` (FastAPI 기본). 검증 오류(422)는 기본 형식 유지.
- 목록: 쿼리 `page`(1부터), `size`(기본 20, 최대 100), 정렬·필터는 기능별 쿼리. 응답 `{"items": [...], "total": 0, "page": 1, "size": 20}`.
- 시간은 ISO 8601 UTC 문자열. 금액은 원 단위 정수.
- 프론트는 `NEXT_PUBLIC_API_BASE_URL`을 기준으로 호출.

## 5. 파일 소유권과 공통 파일

| 경로                                                                          | 담당                                                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `backend/app/{presentation,application,domain,infrastructure}/accounts/`      | 지나                                                                          |
| `.../catalog/`                                                                | 서현                                                                          |
| `.../purchases/`                                                              | 영우                                                                          |
| `.../experiences/`                                                            | 형준                                                                          |
| 공통 인증·JWT 코드                                                            | 지나                                                                          |
| `main.py`, `core/config.py`, `core/logging.py`, 의존성 파일(`pyproject.toml`) | 형준 통합 (요청은 PR 설명에 한 줄)                                            |
| `core/database.py`                                                            | 영우 초안 제안(현재 형준이 초안 작성, 영우 버전이 있으면 교체)                |
| DB 마이그레이션                                                               | 자기 테이블만. 파일명 `YYYYMMDDNNNN_<기능>_*.sql`, 타인 테이블 변경은 합의 후 |

## 6. 합의 체크리스트

- [ ] 사용자 식별: B안 확정 또는 대안 (지나)
- [ ] 외래키 교체 마이그레이션 적용 시점과 담당 (형준 실행, 영우·서현·지나 확인)
- [ ] 상품 ID text·`is_active` 기준 확인 (서현·영우)
- [ ] 배송지 컬럼 위치 (지나·영우)
- [ ] 공통 형식 §4 확인 (전원)
- [ ] Google 로그인 이번 범위 포함 여부 (지나)
