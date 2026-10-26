# 4조 API 약속

작성: 형준, 2026-10-23, 갱신: 2026-10-26. 사용자 식별·상품 기준·배송지·수량/배송비 정책은 **2026-10-26 팀 합의 방향**을 반영했습니다(영우·지나·서현 확인, 사용자 UUID 연결의 실제 동작 확정은 지나의 사용자 생성 시험 후). 변경은 PR로만 합니다. DB 사실은 새 Supabase에서 조회한 실제 스키마 기준입니다.

## 0. 사용자 식별 — 합의 방향 (2026-10-26, 지나 안 A')

실제 스키마 사실:

- `profiles.id`, `cart_items.user_id`, `wishlist_items.user_id`, `orders.user_id`, `user_coupons.user_id`가 모두 `auth.users(id)`를 외래키로 참조합니다(`on delete cascade`).
- 과제 요건상 비밀번호 해싱·JWT 발급·검증·블랙리스트는 FastAPI가 직접 구현합니다(지나, `app_users`·`revoked_tokens`).

**결정:**

- 기존 `auth.users.id`를 장바구니·주문·프로필·찜·체험 예약 등 서비스 데이터의 **공통 사용자 UUID**로 유지합니다.
- FastAPI `app_users`는 인증 정보를 관리하되, 모든 사용자는 `app_users.id`를 `auth.users.id`와 **같은 UUID**로 씁니다(`supabase_user_id`도 같은 값). JWT의 `sub`도 이 UUID입니다.
- **다른 담당 테이블의 외래키를 `app_users`로 바꾸지 않습니다.** (초안에서 제안했던 외래키 일괄 교체 B안은 범위가 커서 철회했습니다.) 예외로 체험 예약 `experience_reservations.user_id`는 형준 소유 테이블이라 `app_users(id)`를 참조합니다(같은 UUID이므로 일관됩니다).
- 사용자 생성은 한 트랜잭션에서 `auth.users(id, email)` → `app_users(id=같은 UUID)` → `profiles(id=같은 UUID)`를 만듭니다. 새 DB에서 `id`+`email`만으로 `auth.users` 직접 INSERT, 같은 UUID로 `app_users`·`profiles`·`cart_items` 생성이 되는 것을 시험(롤백)으로 확인했습니다.
- 서현이 만든 고객 데모 로그인·관리자 로그인(개발용 admin, 관리자 가입·승인)은 FastAPI JWT와 별개 경로로 유지합니다. 관리자 API(상품 수정 등)는 `app_users.role='admin'` JWT가 필요하므로 연결 방법은 서현·지나가 정합니다.
- 로그인·로그아웃·마이페이지는 FastAPI JWT. 토큰은 HttpOnly, SameSite=Lax 쿠키에만 저장합니다(localStorage 금지).

## 1. 인증 규격

- 전달: `Authorization: Bearer <access_token>`, 로그인은 OAuth2 password flow(`POST /api/v1/accounts/login`, form).
- 토큰 클레임: `sub`=공통 사용자 UUID 문자열(`auth.users.id`와 같음), `role`=`user`|`admin`, `jti`=블랙리스트용 고유 ID, `iat`, `exp`, `type`.
- 로그아웃: `jti`를 블랙리스트에 저장, 같은 토큰 재사용 시 401.
- 공통 의존성(지나 소유): `get_current_user`(인증 실패 401), `require_admin`(권한 부족 403). 각자 자기 API의 **소유권 검사**는 직접 구현.
- 상태 코드: 입력 오류 422, 인증 없음/만료/로그아웃된 토큰 401, 권한 없음 403, 없음 404, 규칙 위반(정원 초과·중복) 409.

## 2. 상품 참조 (서현·영우)

- `products.id`는 **text**(uuid 아님). 예: `carrot-1`류 문자열. API에서도 문자열로 주고받습니다.
- 가격은 `products.price`(정수, 원), 판매 여부는 `products.is_active`. 주문 금액은 클라이언트 금액을 믿지 않고 서버가 `price × quantity`와 배송비로 다시 계산합니다.
- **판매 중지(`is_active=false`)**: 고객 상품 목록에서 제외. 신규 담기·수량 변경·주문은 거부(409). 기존 장바구니에는 "구매 불가"로 표시하되 합계에서 제외.
- **품절**: 고객 목록·상세에는 남기고 구매만 막는 정책을 서현이 제안했습니다. `is_active`만으로는 구분할 수 없어 **품절 여부 필드(제안: `products.is_sold_out boolean not null default false`)**를 서현·영우가 합의해야 합니다. 재고 수량 차감은 동시성·트랜잭션 범위가 커서 이번 필수 범위에서는 제외하는 것을 제안합니다. 합의되면 서현이 마이그레이션을 작성하고 PM이 검토 후 새 DB에 적용합니다. 품절 상품의 담기·주문은 판매 중지와 같이 거부(409)합니다.
- 주문 당시 값은 `order_items`(product_id text, product_name, product_unit, unit_price, quantity)에 복사 저장합니다(이미 스키마에 있음). 가격이 바뀐 상품은 주문 시점 가격으로 다시 계산합니다.
- 장바구니·주문 정책(영우 합의): 수량 1~99(합쳐서 99 초과는 422 거부), 상품 합계 2만원 이상 무료·미만 3,500원, 쿠폰 할인 제외, 모의 결제는 항상 성공(결제 수단만 기록, 카드번호 미수신), 같은 `request_key`는 기존 주문 반환.

## 3. 배송지 (지나·영우)

- 기본 배송지는 `profiles`의 `recipient_name, recipient_phone, postal_code, address, address_detail`. 주문 화면은 `GET /api/v1/accounts/me/address`로 불러옵니다.
- 주문 생성 시 서버가 해당 배송지를 다시 확인해 `orders`의 같은 5개 컬럼에 스냅샷으로 복사해 저장합니다. 이후 프로필을 바꿔도 주문은 변하지 않습니다.

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

## 6. 합의 현황

- [x] 사용자 식별: 지나 안 A' 방향 합의(2026-10-26). 사용자 생성 절차의 실제 동작은 지나의 시험 후 최종 확정
- [x] 외래키: 다른 기능 테이블은 변경하지 않음. 체험 예약만 `app_users(id)` 참조(적용 완료)
- [x] 상품 기준(`price`·`is_active`)·판매 중지 처리·장바구니/주문 정책 (서현·영우)
- [x] 배송지: `GET /accounts/me/address` + 주문 스냅샷 (지나·영우)
- [x] 화면 로그인: FastAPI JWT, HttpOnly·SameSite=Lax 쿠키
- [ ] 품절 필드(`is_sold_out` 제안) 합의와 마이그레이션 (서현·영우, PM 적용)
- [ ] 서현 관리자 화면 ↔ FastAPI 관리자 JWT 연결 방법 (서현·지나)
- [ ] 공통 형식 §4 확인 (전원)
- [ ] Google 로그인 이번 범위 포함 여부 (지나, 기본은 제외)
