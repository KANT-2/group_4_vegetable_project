# 장바구니 API (영우) — 1단계

작성: 2026-10-26 / 담당: 영우 / 브랜치: `youngwoo`

이 문서는 장바구니 API의 구현 범위, 임시로 정한 값, 실제 실행한 검증과 하지 못한 검증을 기록합니다. 주문·결제는 이후 단계이며 이 PR에 포함하지 않았습니다.

## 범위

- 구현: 담기, 내 장바구니 조회, 수량 변경, 삭제 (`backend/app/*/purchases/`).
- 제외: 서버 배송비 계산, 모의 주문 생성, 주문 목록·상세, 프론트 연결, 쿠폰, 환불.
- 라우터 등록: 형준 님 허락으로 이 PR이 `main.py`에 `cart_router` 등록과 `register_purchase_error_handlers(app)` 두 줄(과 필요한 import 두 줄)만 추가했습니다. 다른 줄은 바꾸지 않았습니다.

## API

모두 `Authorization: Bearer <access_token>`이 필요합니다. 주소는 `/api/v1/purchases/cart` 아래입니다.

| 메서드·경로 | 설명 | 성공 |
| --- | --- | --- |
| `GET /purchases/cart` | 내 장바구니. 줄별 단가·수량·줄 합계·판매 여부와 `subtotal_amount` | 200 |
| `POST /purchases/cart/items` | `{product_id, quantity}`. 이미 담긴 상품이면 수량을 더함 | 201 |
| `PATCH /purchases/cart/items/{product_id}` | `{quantity}`로 수량 변경 | 200 |
| `DELETE /purchases/cart/items/{product_id}` | 장바구니에서 빼기 | 204 |

오류는 `{"detail": "메시지"}` 형식입니다.

| 상황 | 상태 |
| --- | --- |
| 토큰 없음·잘못됨·만료 | 401 |
| 수량이 1~99 밖이거나 정수가 아님, 합쳐서 99 초과, 요청에 `user_id` 같은 정의되지 않은 필드가 있음 | 422 |
| 없는 상품, 장바구니에 없는 상품(수정·삭제) | 404 |
| 판매가 끝난 상품을 새로 담거나 수량을 바꿈 | 409 |

`GET` 응답은 한 사람의 장바구니라서 `page`/`size` 없이 `{items, subtotal_amount}`를 줍니다.

## 사용자 분리

사용자는 토큰의 `sub`로만 정합니다. 요청 본문·주소에는 `user_id`를 받지 않고(보내면 422), 항목도 `product_id`로 찾기 때문에 다른 사람의 항목을 가리킬 방법이 없습니다. 다른 사용자가 같은 `product_id`를 수정·삭제해도 자기 장바구니에 없으면 404이고 원래 주인의 항목은 그대로입니다.

## 임시로 정한 값 (팀 확인 필요)

| 항목 | 현재 값 | 이유 |
| --- | --- | --- |
| 수량 범위 | 1~99 (`MAX_QUANTITY`, `domain/purchases/cart.py`) | 기존 `cart_items` DB 제약과 같음. 새 과제 규칙으로 확정된 값이 아님 |
| 합쳐서 99 초과 | 자르지 않고 422로 거부 | 기존 웹은 조용히 99로 잘랐지만, 사용자가 모르게 수량이 바뀌지 않게 함 |
| 판매 중지 상품 | 새로 담기·수량 변경은 409, 이미 담긴 항목의 조회·삭제는 허용, `subtotal_amount`에서 제외 | 기존 웹 동작과 같음 |

판매 여부는 `products.is_active`, 가격은 `products.price`(정수, 원)를 읽습니다. 서현 님 담당 데이터이며 이 PR은 읽기만 합니다.

## 인증

로그인 사용자는 지나 님의 공통 인증(`app.presentation.accounts.dependencies`의 `CurrentUser`)을 씁니다. 로그아웃(블랙리스트)된 토큰과 비활성 계정은 그쪽에서 401로 차단됩니다. 사용자 ID는 JWT `sub`(= `auth.users.id`와 같은 UUID)이고, 장바구니는 이 ID로만 소유권을 검사합니다. 형준 님이 남겨 둔 옛 임시 어댑터(`experiences/dependencies.py`)는 더 이상 쓰지 않으므로 삭제해도 됩니다.

## 검증 기록

실행한 명령: `backend/`에서 `python -m pytest` (Python 3.14, 의존성은 `pyproject.toml` 기준 설치).

| 테스트 | 내용 | 결과 |
| --- | --- | --- |
| `tests/test_cart_domain.py` | 수량 경계(0, 1, 99, 100), bool·실수·문자열 거부, 합치기, 상한 초과 거부, 판매 중지 상품 | 통과 |
| `tests/test_cart_service.py` | 담기·합치기·변경·삭제, 잘못된 수량이면 저장 안 됨, 없는 상품 404, 판매 중지 거부, 사용자 분리, 합계에서 판매 중지 제외, 저장 실패 시 롤백 | 통과 |
| `tests/test_cart_api.py` | 라우터·오류 변환. 토큰 없음·잘못됨 401은 지나 님 실제 인증으로, 로그인 사용자 동작·사용자 분리는 인증을 헤더로 대체해 DB 없이 검증. 422(여러 입력), 404, 409, `user_id` 필드 거부 | 통과 |

- 새 테스트 51개와 금액·주문 도메인 테스트 97개를 포함해 최신 `develop`(형준 님 #12까지) 위에서 전체 222개 통과, DB가 필요한 17개는 `DATABASE_URL`이 없어 건너뜀.
- 테스트가 실제로 잘못된 코드를 잡는지 확인하려고 규칙을 일부러 깨 보았습니다(상한 초과를 자르기, 롤백 호출 빼기, 판매 중지 확인 빼기). 각각 관련 테스트가 실패했고 원래대로 되돌린 뒤 전부 통과했습니다.
- SQL 저장소(`infrastructure/purchases/cart_repository.py`)는 PostgreSQL 문장으로 만들어지는지(조회·`FOR UPDATE`·`ON CONFLICT DO UPDATE`)만 확인했습니다.

### 미실행 (이 PR 이후 확인 필요)

- **실제 PostgreSQL에 대한 실행.** 이 PC에 `DATABASE_URL`이 없어 저장소 쿼리, 동시 담기(`ON CONFLICT`), 외래키·제약 동작은 실행해 보지 못했습니다. DB 주소가 있으면 실제 DB 통합 테스트를 추가합니다.
- 사용자 식별: 팀 합의(2026-10-26)로 `auth.users.id`를 공통 사용자 UUID로 유지합니다. `cart_items.user_id`·`orders.user_id`의 외래키는 바꾸지 않으며 이 PR도 DB를 바꾸지 않습니다. 테스트 계정은 `auth.users`와 `app_users`를 같은 UUID로 만들어야 합니다.
- 프론트(`/cart`)는 아직 이 API를 호출하지 않습니다.
