# 공통 DB 테이블 구성

DB 생성 담당은 C 이상재입니다. 하나의 Supabase 프로젝트에서 공통 테이블·외래 키·CHECK·인덱스·수정 시각 트리거·RLS를 관리합니다. A는 레시피, B는 상품·채소의 컬럼 검토·예시 데이터·조회 함수·화면을 담당합니다.

## 준비된 테이블

| 테이블            | 데이터·기능 담당 | 일반 사용자 권한                      |
| ----------------- | ---------------- | ------------------------------------- |
| `vegetables`      | B                | 누구나 읽기                           |
| `products`        | B                | 판매 중 상품만 읽기                   |
| `recipes`         | A                | 누구나 읽기                           |
| `recipe_products` | A                | 누구나 읽기                           |
| `profiles`        | C                | 본인 조회·생성·수정                   |
| `cart_items`      | C                | 본인 조회·추가·수정·삭제              |
| `wishlist_items`  | C                | 본인 조회·추가·삭제                   |
| `orders`          | C                | 본인 조회, 직접 쓰기 불가             |
| `order_items`     | C                | 본인 주문의 상품 조회, 직접 쓰기 불가 |

`auth.users`는 Supabase Auth가 관리하므로 별도로 만들지 않습니다. 상품·레시피 등 공개 데이터도 브라우저에서 직접 쓰지 못하며, A·B의 seed를 C가 검토해 SQL Editor 또는 CLI에서 입력합니다. `service_role`은 서버 전용 특권 역할로 RLS를 우회하므로 키를 프론트에 제공하지 않습니다.

## 적용 순서

**2026-10-08 적용 완료:** `.env.local`과 일치하는 `vegetable` 프로젝트에 로그인된 Dashboard의 SQL Editor로 프로필·공통 테이블·B의 catalog seed를 한 트랜잭션으로 적용했습니다. 적용 전 public 테이블이 없는 것을 확인했고 적용 후 테이블 9개·RLS 활성화 9개·채소 12개·상품 16개·레시피 0개를 확인했습니다. 공개 키의 상품·채소 조회도 성공했으며 개인 테이블 5개는 비로그인 접근이 거부됐습니다. [검증 화면](screenshots/supabase-db-setup.png)을 참고합니다.

**2026-10-08 B 적용:** B 심우섭이 SQL Editor로 catalog seed를 다시 적용해 채소 21종·상품 67개를 확인했습니다. 구조 변경은 없습니다.

**2026-10-11 B 적용:** B 심우섭이 SQL Editor로 `202610110002_product_display_fields.sql`과 catalog seed를 순서대로 적용했습니다. 적용 전 `products.tagline`은 이미 있었고(값 없음, 출처 migration 없음) `rating`·`review_count`는 없었습니다. migration은 이미 있는 컬럼을 건너뛰도록 작성했습니다. 적용 후 상품 67개 모두 tagline·rating이 채워졌고 CHECK 제약 3개가 추가된 것을 확인했습니다. 별점·리뷰 수는 시연용 가상 데이터입니다.

아래 초기 생성 SQL은 이미 적용했으므로 현재 공유 DB에서 다시 실행하지 않습니다. 이후 구조 변경은 새 migration으로 작성하며 공유 DB를 reset하지 않습니다. Supabase CLI는 아직 연결하지 않았고 SQL Editor 실행은 CLI migration 이력에 자동 등록되지 않으므로, 향후 CLI 도입 시 원격 스키마와 적용 이력을 먼저 맞춘 뒤 db push를 사용합니다.

Supabase Dashboard의 프로젝트 → SQL Editor에서 아래 순서로 파일 내용을 각각 실행합니다.

1. `supabase/migrations/202610080001_profiles.sql`
2. `supabase/migrations/202610080002_market_tables.sql`
3. `supabase/migrations/202610080003_storage.sql`

위 순서는 새 개발 DB를 구성할 때의 기준입니다. 현재 공유 DB에는 세 파일이 모두 적용됐습니다. 각 파일은 트랜잭션으로 구성했으며 테이블·정책이 이미 존재하면 실패하도록 했습니다. CLI를 사용할 경우 적용 이력을 확인하고 동일한 파일을 두 번 적용하지 않습니다.

Storage는 2026-10-08 별도 트랜잭션으로 적용했습니다. 기존 `market-images` bucket이 없는 것을 확인한 뒤 공개 이미지 bucket·5 MiB 제한·허용 이미지 MIME·일반 사용자 쓰기 차단 정책 3개를 생성하고 실제 설정을 조회했습니다. [Storage 검증 화면](screenshots/supabase-storage-setup.png)을 참고합니다. 새 DB에는 migration을 모두 적용한 뒤 `supabase/seeds/catalog.sql`을 실행합니다.

두 번째 파일은 채소 → 상품·레시피 → 레시피 연결·장바구니·찜 → 주문 → 주문상품 순서로 생성합니다. B의 원본 catalog seed는 `supabase/seeds/catalog.sql`에 저장하고 적용했습니다. seed는 같은 ID의 데이터를 덮어쓰므로 의도적인 데이터 갱신일 때만 재실행합니다. A의 레시피·상품 연결 seed와 테스트 Auth 계정은 아직 준비·적용 전입니다.

DB 컬럼은 ERD의 `snake_case` 기준입니다. 기존 Mock의 `vegetableId`, `imageUrl`, `isFeatured` 등은 조회 함수에서 `vegetable_id`, `image_path`, `is_featured`에 대응시킵니다. Storage 정책은 적용했으며 실제 이미지 파일 업로드는 A·B의 후속 작업입니다. DB 타입과 이미지 URL 함수 사용법은 [백엔드 연결 안내](backend.md)를 참고합니다.

## 제약과 이후 기능 구현

- 가격은 양수, 정상가는 판매가 이상, 수량은 정수 타입이며 1~99입니다.
- category·ugly_reason·difficulty·주문 status는 text + CHECK로 제한합니다.
- JSON 재료·조리 순서는 배열만 저장합니다. 상세 항목 구조는 서버 입력에서 검증합니다.
- 장바구니·찜은 사용자와 상품 조합이 유일하며, 주문은 사용자와 request_key 조합이 유일합니다.
- products·cart_items·orders의 updated_at은 트리거로 갱신합니다. profiles는 첫 migration의 트리거를 사용합니다.
- paid 상태와 paid_at은 함께 설정해야 하며 국내 우편번호는 5자리 문자열입니다. 연락처 상세 형식은 서버에서 검증합니다.
- 주문상품이 참조한 상품은 삭제할 수 없습니다. 판매 종료는 products.is_active = false로 처리합니다.

이번 작업은 테이블 구성까지입니다. 중복 담기 수량 합산, 찜에서 장바구니 이동, 주문 생성·모의 결제 RPC/API는 만들지 않았습니다. 주문 총액과 주문상품 합계의 일치, 주문상품 1개 이상, 주문 당시 정보 저장, 허용된 상태 전이·동시 요청 처리는 이후 인증·소유권 검증을 포함한 트랜잭션 함수에서 보장해야 합니다. 기능을 붙이려고 일반 사용자 주문 INSERT·UPDATE 권한을 열지 않습니다.

## 로컬 검증

```powershell
npm ci
npm test
```

`tests/database.test.mjs`는 PGlite PostgreSQL 엔진에 Supabase의 최소 Auth·Storage 테이블·역할·auth.uid() 테스트 대역을 구성하고 실제 migration 세 개를 실행합니다. 9개 테이블의 RLS 활성화, 공개·판매 종료 상품 조회, 두 사용자 간 개인 데이터 분리·변경 차단, 가격·수량·상태·외래 키·유일성 제약과 Storage 일반 사용자 쓰기 차단을 검사합니다. 실제 Supabase 프로젝트에 데이터를 보내지 않습니다.

실제 Auth JWT 검증과 PostgREST 연동은 대역 테스트의 범위에 포함되지 않으므로 공유 DB 적용 후 테스트 계정 2개로 다시 확인합니다. [PostgreSQL RLS 공식 문서](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [PGlite 공식 문서](https://pglite.dev/docs/)를 참고했습니다.
