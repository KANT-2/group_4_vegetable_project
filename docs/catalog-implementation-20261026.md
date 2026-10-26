# 서현 catalog 구현·검증·팀 통합 기록

작성일: 2026-10-26. 이번 문서는 상품·찜·최소 상품 운영의 FastAPI 전환에 대한 기록입니다. PR 준비 시 최신 develop(eb219af)을 반영하고 구매 기능과 겹치는 파일을 통합했습니다.

## 1. 전체 과정과 작업량

일반적인 수동 개발 기준 약 4~8시간(반나절~하루)의 작업량입니다. 아래 시간은 계획용 추정이며 실제 소요 시간을 측정한 결과가 아닙니다. 팀 브랜치 통합·배포 검증은 별도입니다.

| 단계 | 작업 | 예상 작업량 | 이번 결과 |
| --- | --- | --- | --- |
| 1 | 사용자 UUID·상품·권한·기존 DB 규격 확인 | 20~40분 | 기존 합의와 SQL 스키마 확인 |
| 2 | catalog 4계층·목록·상세·검색·필터·정렬·페이지네이션 | 1~2시간 | 구현·API 및 실제 Repository SQL 테스트 |
| 3 | 찜·중복 방지·소유권·관리자 가격/판매 여부 검증 | 1~1.5시간 | 구현·권한 및 실제 DB 흐름 검증 |
| 4 | 고객 상품·찜·헤더·관리자 화면을 API와 연결 | 1~2시간 | 연결·페이지 이동·고객 HTTP 응답 확인 |
| 5 | 회귀 테스트·빌드·팀 전달 기록 | 40~90분 | 검사·기록 완료 |

## 2. 완료한 범위

- 상품 목록·상세·검색·카테고리·못난이 이유·가격 범위·기획전 필터·정렬·페이지네이션.
- 검색어의 공백·대소문자를 정규화하고 SQL의 `%`, `_`를 문자 그대로 취급합니다. 검색 값은 SQL 파라미터로 바인딩합니다.
- 목록은 DB에서 필터링·정렬·LIMIT/OFFSET 처리합니다. 정렬 동률은 상품 ID로 결정합니다.
- 판매 중지 상품은 공개 목록에서 제외하고 공개 상세는 404입니다.
- 관리자는 판매 중지 상품도 조회하고 가격·판매 여부를 수정할 수 있습니다.
- 가격은 1~2,147,483,647원의 정수이며 정상가를 초과할 수 없습니다. 문자열·불리언·소수·null·알 수 없는 변경 필드를 거부합니다.
- 찜은 JWT의 사용자 UUID를 사용합니다. 클라이언트에서 소유자 UUID를 받지 않습니다.
- 기존 DB UNIQUE(user_id, product_id)와 ON CONFLICT DO NOTHING으로 중복 찜을 방지합니다.
- 찜 삭제 SQL에 user_id와 product_id 조건을 함께 적용합니다. 타인 소유 또는 없는 찜은 동일하게 404입니다.
- 판매 중지된 기존 찜도 본인의 목록에서 확인·삭제할 수 있습니다.
- 공통 인증을 그대로 사용하므로 비활성 계정·로그아웃 토큰·잘못된 토큰은 차단됩니다. 관리자 API는 DB에서 확인한 공통 관리자 권한이 필요합니다.
- 관리자 저장은 성공 응답 이후에만 완료 안내를 표시합니다. 고객·관리자 페이지는 3초 간격과 창 포커스 시 DB 변경 버전을 확인해 갱신합니다.

## 3. 4계층

| 계층 | 파일 | 역할 |
| --- | --- | --- |
| domain | `backend/app/domain/catalog/models.py` | 가격·판매 여부 규칙. FastAPI·SQLAlchemy에 의존하지 않음 |
| application | `backend/app/application/catalog/ports.py`, `service.py` | 저장소 인터페이스·유스케이스·트랜잭션 |
| infrastructure | `backend/app/infrastructure/catalog/models.py`, `repository.py` | 기존 PostgreSQL 테이블 ORM·SQL·고유 제약 활용 |
| presentation | `backend/app/presentation/catalog/schemas.py`, `dependencies.py`, `router.py` | 입력·출력 규격·인증 의존성·HTTP 상태 |

상품 수정은 행 잠금 후 변경하고 commit합니다. 예외 시 rollback합니다. 기존 상품·찜 테이블을 사용하므로 이번 기능에 필요한 새 테이블·마이그레이션은 없습니다.

## 4. API

공통 접두어: `/api/v1/catalog`.

| 메서드 | 경로 | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/products` | 공개 | 상품 목록 |
| GET | `/products/{product_id}` | 공개 | 판매 중인 상품 상세 |
| GET | `/version` | 공개 | 상품 변경 감지용 버전 |
| GET | `/admin/products` | 관리자 JWT | 판매 중지 포함 목록 |
| PATCH | `/admin/products/{product_id}` | 관리자 JWT | 가격·판매 여부 수정 |
| GET | `/wishlist` | 사용자 JWT | 본인 찜 목록·페이지네이션 |
| GET | `/wishlist/ids` | 사용자 JWT | 헤더·하트 초기 상태용 본인 상품 ID |
| PUT | `/wishlist/{product_id}` | 사용자 JWT | 찜 추가, 이미 있으면 성공 |
| DELETE | `/wishlist/{product_id}` | 사용자 JWT | 본인 찜 삭제 |

상품 목록 쿼리:

- `page`: 1~100000, 기본 1.
- `size`: 1~100, 기본 20.
- `q`: 최대 100자. 상품 ID·상품명·농가명·홍보 문구·채소명 검색.
- `category`: root / leaf / fruit_veg / mushroom / fruit / seasoning.
- `reason`: small / bent / scratched / irregular.
- `sort`: recommended / seasonal / reviews / newest / price_asc / price_desc / discount_desc.
- `collection`: seasonal / bigsale / bulk / single.
- `min_price`, `max_price`: 선택 가격 범위. 최소 > 최대는 422.
- 관리자 목록만 `status`: all(기본) / active / inactive.

응답은 `{items,total,page,size,reason_counts}`입니다. reason_counts는 현재 검색·카테고리·기획전·가격 조건에서 reason 조건만 제외한 전체 개수입니다. 리뷰 정렬의 review_count는 기존 시연 데이터이며 이번에 구매 리뷰 집계를 구현한 것은 아닙니다.

수정 예시:

```http
PATCH /api/v1/catalog/admin/products/carrot-1kg
Authorization: Bearer <admin JWT>
Content-Type: application/json

{"price": 1800, "is_active": true}
```

응답: 정상 200, 입력 오류 422, 인증 실패 401, 일반 사용자 403, 없는 상품 404.

## 5. 화면 연결·실행

- 상품 데이터의 기본 경로는 FastAPI입니다. `CATALOG_SOURCE=mock`을 명시했을 때만 기존 파일 기반 오프라인 상품 시연을 사용합니다.
- 상품 API 장애를 가짜 상품으로 바꿔 숨기지 않습니다. 상품 화면에는 재시도 UI가 표시됩니다.
- `FASTAPI_URL` 또는 `NEXT_PUBLIC_API_BASE_URL`로 서버 주소를 지정합니다. 기본 주소는 `http://127.0.0.1:8000`입니다.
- 상품 목록 화면은 한 페이지 20개입니다. 필터·검색·정렬은 API로 전달하고 페이지 링크는 조건을 유지합니다.
- 기존 메인·농가·레시피·프로모션의 관련 상품도 같은 상품 조회 서비스를 사용합니다. 예전 파일 상품 수정이 DB 가격을 덮어쓰지 않습니다.
- 찜 버튼·찜 목록·헤더 하트 상태는 FastAPI JWT 사용자에 대해 catalog API를 사용합니다. JWT는 기존 HttpOnly 쿠키에서 서버가 읽으며 브라우저 localStorage에 저장하지 않습니다.
- 실제 상품 관리에서는 기존의 상품 등록/사진/수량 폼 대신 최소 가격·판매 여부 수정 UI를 사용합니다. 상품 신규 등록·업로드·재고 운영은 이번 필수 범위에서 제외한 팀 기준에 따릅니다.
- 로컬 관리자 쿠키만 있는 사용자는 DB 상품을 수정할 수 없습니다. 지나의 절차로 생성한 FastAPI 관리자 계정으로 로그인해야 합니다.
- 기존 Supabase 로그인·고객 데모의 구형 찜 경로는 `CATALOG_SOURCE=mock` 시연에서만 남아 있습니다. 과제 검증은 반드시 FastAPI 계정을 사용합니다.

실행:

```powershell
# backend/.env의 기존 DATABASE_URL·JWT_SECRET_KEY 설정 필요. 비밀값은 Git 제외.
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# 다른 터미널, 프로젝트 루트
npm run dev
```

확인 화면: `/products`, `/products?q=당근&sort=price_asc`, `/products?page=2`, `/cart?tab=wishlist`, `/admin`.

## 6. 이번에 실제 실행한 검증

| 검증 | 결과 |
| --- | --- |
| 프론트 타입 검사 | 통과 |
| 프론트 전체 린트 | 통과 |
| 프론트 전체 Node 테스트 | 최신 develop 통합 후 153개 통과 |
| 선별 백엔드 회귀 + catalog | 388개 통과. 실제 DB 테스트는 별도 실행으로 검증 |
| 최신 공통 오류 처리 실제 DB 테스트 | 3개 통과 |
| 실제 PostgreSQL catalog 통합 테스트를 별도 opt-in 실행 | 1개 통과 |
| 프로덕션 빌드 | 통과. 기존 로컬 파일 저장 모듈의 동적 파일 접근 경고 6개 있음 |
| 실행 중인 FastAPI 상품 목록 | HTTP 200, 판매 중인 DB 상품 67개 조회 |
| 고객 `/products?page=2` HTTP 응답 | API가 돌려준 20개 상품 링크와 화면 링크가 정확히 일치 |
| 고객 ‘당근’ 검색·낮은 가격순 HTTP 응답 | DB 검색 결과 4개와 화면 링크 일치, 가격 오름차순 확인 |
| 메인 HTTP 응답 | 정상 |

실제 DB 통합 테스트는 지나의 `scripts.create_user.create_user`로 사용자 A·B·관리자를 생성하고 실제 로그인으로 JWT를 받아 실행했습니다. 새 테스트 상품만 수정하며 기존 상품·계정을 변경하지 않습니다. 전체 과정을 외부 트랜잭션 안에서 수행하고 최종 롤백했습니다. 종료 후 테스트 상품과 auth.users 계정이 0건인지 재조회했습니다.

그 테스트가 확인한 것:

1. 실제 계정 생성·로그인과 상품 검색.
2. 일반 사용자의 관리자 수정 403, 잘못된 가격 422.
3. 관리자 가격 수정 후 재조회에 변경 반영.
4. 같은 상품 세 번 찜해도 한 건 유지.
5. 사용자 B의 사용자 A 찜 삭제 404, A의 찜은 유지.
6. 판매 중지 후 공개 상세 404, 기존 찜 삭제 가능.
7. 로그아웃한 JWT로 찜 조회·추가·삭제 모두 401.
8. 판매 재개 후 조회 가능.

PostgreSQL 테스트 재실행(공유 DB에 임시 쓰기 후 전부 롤백하므로 팀 DB 접속 여유가 있을 때 실행):

```powershell
cd backend
$env:CATALOG_RUN_DB_TESTS='1'
.\.venv\Scripts\python.exe -m pytest -q tests/test_catalog_db.py
Remove-Item Env:CATALOG_RUN_DB_TESTS
```

브라우저에서 클릭해 확인하는 종단 간 시연과 배포 환경 검증은 아직 하지 않았습니다. 현재 결과는 API·실제 DB·HTTP 응답·자동화 테스트 기준입니다. 동시 찜 요청을 실제 DB에서 병렬 실행한 테스트는 없으며, 동시 중복 방어는 기존 UNIQUE와 PostgreSQL UPSERT를 사용합니다.

## 7. 팀 전달 사항·남은 경계

### 형준님

실행 가능한 로컬 연결 검증을 위해 `main.py`에 catalog router import·등록 두 줄만 추가했습니다. 공통 파일 담당자의 PR 검토가 필요합니다. router는 `/api/v1`에 등록하며 다른 기능 라우터·오류 핸들러는 변경하지 않았습니다.

### 영우님

- 주문이 읽는 기준은 기존과 동일하게 `products.id`(text), `products.price`(정수 원), `products.is_active`입니다.
- 관리자 변경은 동일 products 테이블에 저장됩니다. 파일 가격이나 화면 금액을 주문 기준으로 사용하지 않습니다.
- 구매 도메인·주문 저장·금액 계산은 변경하지 않았습니다.
- `src/actions/cart.ts`는 찜 API 분기, `src/services/cart.ts`는 찜 조회·하트 상태 분기만 연결했습니다. `src/app/api/navigation/route.ts`에도 JWT 사용자의 catalog 찜 ID 조회를 추가했습니다. youngwoo 브랜치와 겹치는 파일이라 병합 시 이 분기를 보존해 주세요.
- PR 준비 중 최신 develop에 병합된 영우님의 장바구니·주문 연결을 반영했습니다. 장바구니 서비스와 테스트 충돌을 해결하고 헤더의 기존 구매 모드 분기에 catalog 찜 조회를 통합했습니다. 자동화 회귀는 통과했으며 전체 구매 흐름의 브라우저 시연·배포 검증은 별도 확인이 필요합니다.

### 지나님

- 공통 CurrentUser/AdminUser 인증 의존성을 그대로 사용합니다.
- 실제 DB 테스트에 기존 사용자 생성 절차를 사용했고 통과했습니다. 인증·회원 파일은 수정하지 않았습니다.

### 품절

현재 합의된 DB 기준은 is_active뿐입니다. `stock=0` 파일 시연과 달리 실제 DB 품절 필드는 아직 합의·적용되지 않았습니다. 이번 구현은 가격·판매 여부라는 필수 범위만 다룹니다. **품절 별도 표시/구매 차단을 실제 DB까지 연결했다고 기록하면 안 됩니다.** `is_sold_out` 또는 재고 필드를 합의한 후 서현 상품 API·영우 장바구니/주문 검증을 함께 반영해야 합니다. 공유 DB 스키마·구매 코드는 임의로 바꾸지 않았습니다.

### Notion에 옮길 요약

> 서현 catalog 4계층과 상품 검색·필터·정렬·페이지네이션, JWT 기반 찜 추가·조회·삭제, 관리자 가격·판매 여부 수정 구현. 일반 사용자 403·가격 오류 422·중복 찜 방지·타인 찜 삭제 차단·로그아웃 토큰 401·관리자 수정 후 재조회 반영을 실제 DB 테스트로 검증. 화면 FastAPI 연결과 페이지 이동 HTTP 확인 완료. 테스트 데이터는 전부 롤백. 품절 필드 합의·영우 구매 PR 통합·브라우저/배포 시연은 후속 확인 필요.
