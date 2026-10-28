# 못난이마켓

## 4조 최종 제출 안내

기존 Next.js 못난이마켓 화면에 FastAPI 백엔드를 연결한 4조 프로젝트입니다. 일반·Google 인증부터 상품, 찜·리뷰, 장바구니·주문, 체험 예약과 관리자 운영까지 하나의 사용자 흐름으로 통합했습니다.

- 저장소: [KANT-2/group_4_vegetable_project](https://github.com/KANT-2/group_4_vegetable_project)
- 최종 ERD: [docs/ERD-current.md](docs/ERD-current.md)
- API 문서: 백엔드 실행 후 [http://localhost:8000/docs](http://localhost:8000/docs)
- 협업 순서: **개인 브랜치 → PR·리뷰 → develop → 통합 검증 → main**

### 팀과 담당 기능

| 담당 | 브랜치      | 주요 기능                                                                               |
| ---- | ----------- | --------------------------------------------------------------------------------------- |
| 지나 | `jina`      | 일반·관리자 회원가입, 아이디/이메일·Google 로그인, JWT·로그아웃 차단, 마이페이지·배송지 |
| 서현 | `seohyeon`  | 상품 조회·검색·필터·찜·리뷰, 관리자 상품·재고·이미지 운영                               |
| 영우 | `youngwoo`  | 비회원/회원 장바구니, 멱등 병합, 모의 결제·주문·환불 신청                               |
| 형준 | `hyungjune` | 체험·회차·예약·취소·접수 마감, 공통 환경·통합 검증·PM                                   |

### 구현 범위

| 영역          | 구현 내용                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------- |
| 인증·계정     | 회원가입, 아이디/이메일 로그인, Google OAuth, JWT, HttpOnly 쿠키, 로그아웃 토큰 차단, 프로필·배송지 |
| 상품·리뷰     | 목록·상세·검색·필터·페이지네이션, 재고·판매 상태, 찜, 구매자 리뷰·이미지                            |
| 장바구니·주문 | 비회원 장바구니, 로그인 시 멱등 병합, 서버 금액·배송비·재고 검증, 주문 스냅샷·중복 방지             |
| 체험 예약     | 체험·회차·잔여석, 예약·취소, 정원·중복·기한 검사, 관리자 접수 마감                                  |
| 관리자        | 관리자 가입 신청·전용 로그인, 상품·리뷰·콘텐츠 관리, 일반 사용자 접근 차단                          |

모의 결제와 환불 신청은 교육용 시연 기능입니다. 실제 PG 승인·환불 송금·배송 추적은 범위에 포함하지 않습니다.

### 시스템 구성과 포트

```text
Next.js 16 / React 19  http://localhost:3000
  ├─ 고객 화면
  ├─ /admin 관리자 화면
  ├─ Supabase Google OAuth
  └─ FastAPI 호출         http://localhost:8000
       └─ Supabase PostgreSQL
```

`3001`은 별도 관리자 애플리케이션이 아니라 같은 Next.js 코드를 다른 포트에서 확인하는 선택 실행 방식입니다. 제출 기준은 프론트 `3000`, API `8000`입니다.

### 실행 순서

```powershell
# 저장소 루트
npm ci
Copy-Item .env.example .env.local

# backend 폴더
uv sync
Copy-Item .env.example .env
uv run uvicorn app.main:app --reload --port 8000

# 다른 터미널의 저장소 루트
npm run dev
```

실제 값은 `.env.local`, `backend/.env`에만 넣고 Git에 올리지 않습니다. 필요한 키와 Google OAuth 설정은 각 예시 파일과 [Google 로그인 문서](docs/google-login.md)를 확인합니다.

### 제출 전 검사

공용 DB 연결 한도를 피하기 위해 `pytest` 전에는 실행 중인 FastAPI 서버를 중지합니다.

```powershell
cd backend
uv run pytest -q

cd ..
npm run lint
npm run typecheck
npm test
```

프로덕션 빌드는 FastAPI를 다시 켠 뒤 `npm run build`로 확인합니다. 브라우저에서는 비회원 장바구니 → 로그인 → 병합 → 배송지 → 주문, 로그아웃 후 401, 일반 사용자의 관리자 접근 403, 관리자 상품·리뷰 운영, 체험 예약·취소를 직접 점검합니다.

### 주요 문서

- [최종 ERD와 사용자 UUID 규칙](docs/ERD-current.md)
- [팀 작업 절차·담당 범위](docs/team-workflow-20261023.md)
- [DB 적용 기록](docs/database.md)
- [Google 로그인](docs/google-login.md)
- [백엔드 구조](docs/backend.md)

<details>
<summary>기존 6조 프로젝트 README 보관본 펼치기</summary>

아래 내용은 인수받은 이전 프로젝트의 구현·운영 이력입니다. 예전 팀원, 저장소·배포 주소와 “FastAPI 미사용” 설명은 이번 4조 과제의 최신 구성이나 완료 상태를 뜻하지 않습니다.

> 모양은 조금 달라도, 맛과 신선도는 그대로.

모양·크기·흠집 때문에 일반 유통에서 판매하기 어려운 농산물을 소개하는 장보기 서비스입니다. 상품을 둘러보고 채소의 보관·손질법과 레시피를 확인한 뒤 로그인·장바구니·주문으로 이어지는 경험을 만듭니다.

**AX2 React 팀 6 · 조영우 / 심우섭 / 이상재 · 문서 갱신: 2026-10-13**

## 바로가기

- [배포 사이트](https://group-6-vegetable-project.vercel.app/)
- [지금까지의 작업 요약](docs/work-summary-20261013.md)
- [팀 Notion](https://app.notion.com/p/teamsparta/6-3f22dc3ef514808ea570f2df24d9af94)
- [Redmine 작업 현황](https://redmine-302549221655.asia-northeast3.run.app/projects/ax2-react-team6)
- [발표 자료](docs/presentation/motnani-market-presentation.pdf)

## 현재 구현 상태

공개 페이지, Google 로그인, 개인 장바구니·찜, 마이페이지, 주문과 주문 상세가 구현되어 Vercel에 배포되어 있습니다. 초기 기획 단계의 ‘프론트 미완료·미배포’ 표기는 현재 상태에 맞게 정리했습니다.

| 영역           | 구현한 작업                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| 메인           | 행사 배너, 3초 페이드 전환, 직접 넘김·일시정지, 추천·제철·할인 상품 진열, 레시피·농가 연결             |
| 상품           | 검색, 카테고리·못난이 상태 필터, 기획전과 정렬, 상품 상세, 수량 선택·담기·찜                           |
| 채소 정보      | 특징, 보관·손질법, 영양 정보, 관련 상품과 레시피 연결                                                  |
| 레시피         | 요리·재료 검색, 채소별 필터, 재료·조리 순서, 쉬운 채소 활용 요리, 관련 상품                            |
| 농가 이야기    | 농장 사진 중심 목록·상세, 지역별 탐색, 농가별 상품·요리 연결                                           |
| 사진·브랜드    | 로고·파비콘 개선, 상품별 갤러리, 카드 사진 자동 페이드, 상세 사진 수동 전환, 농가에 맞는 사진 교체     |
| 인증·개인 화면 | Google 로그인·로그아웃, 세션 갱신, 회원 프로필, 기본 배송지, 개인 페이지 보호                          |
| 장바구니·찜    | 같은 화면의 탭으로 통합, 수량 변경·삭제·합계, 사용자별 저장, 헤더 수량 갱신                            |
| 주문·결제      | 배송지·결제 수단 선택, 주문 저장, 주문 내역·상세, 환불 신청 접수, 주문 당시 상품·금액·배송지 기록      |
| 디자인         | 테라코타 색상 유지, 회원·결제·주문 상세 리뉴얼, 모바일 메뉴·필터 스크롤 화살표, 중복 소개·빈 공간 정리 |
| 프로모션       | 오픈런·첫 구매·배송 안내·김장 할인·가족 체험 상세, 메인과 동일한 배너, 혜택 영역 이동, 관련 상품       |

상단 **‘혜택과 이야기’ 메뉴**, 행사 목록 `/promotions`와 상세 페이지는 main에 반영되어 있습니다.

### 실제 동작과 안내 화면의 구분

- 인증과 개인 데이터는 Supabase Auth·PostgreSQL·RLS를 사용합니다. 공개 콘텐츠의 개발용 데이터와 실제 로그인 사용자를 구분합니다.
- 주문 흐름은 교육용 모의 결제입니다. 실제 금액 청구·PG·실물 배송·환불 송금은 하지 않습니다. 화면의 ‘결제 완료’ 문구와 실제 결제 연동 여부는 별개입니다.
- 쿠폰 조건과 김장체험 일정·참가비는 사용자 승인으로 정한 기획안입니다. 쿠폰 발급·내 쿠폰함을 추가했고 공유 DB migration도 적용했습니다. 결제 할인 적용·체험 접수는 준비 상태입니다.
- 상품·농가·별점·리뷰에는 교육용 데이터가 포함됩니다. 참고 사진은 해당 농가의 실제 촬영·입점 증빙을 뜻하지 않습니다.

## 팀원별 작업

페이지·품목 개수 대신 실제 구현한 기능과 해결한 문제를 기록합니다. 최초 담당 범위와 이후 공동 개선 작업을 함께 정리했습니다.

| 담당         | 주요 작업                                                                                                                       | 이후 개선·통합                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A 조영우** | 메인·농가 이야기·레시피 목록/상세, 공식 자료 카탈로그, 레시피·채소·상품 연결, 디자인 규칙·작업 문서                             | 쉬운 채소 요리·사진 보완, 농가 사진 중심 UI, 상품 갤러리·페이드, 회원·결제·주문 상세 디자인 리뉴얼, 모바일 메뉴 개선, 프로모션·동일 배너·혜택 메뉴, README 정리 |
| **B 심우섭** | 상품·채소 화면과 DB 조회, 검색·필터·정렬, 가격·상태·제철, 영양 정보                                                             | 공통 디자인, 모바일 필터, 상세 뒤로 가기, 지역별 농가 탐색, 농가·상품 사진·로고·제목 개선, 공식 레시피 migration·seed DB 적용 기록                              |
| **C 이상재** | Next.js·Supabase 기반, DB·제약·RLS, Google 인증·세션·개인 권한, 공통 메뉴, 프로필·배송지, 장바구니·찜, 주문·모의 결제·환불 신청 | 결제 수단·배송비 검증, 앱 통합·배포, 레시피 카드 사진 경로 수정, 농가 간 사진 공유 방지, 로고·행사 배너 통합                                                    |
| **공동**     | PR 리뷰·충돌 해결, 공통 UI·데이터 ID 연결, 모바일 교차 검수, GitHub·Redmine·Notion 기록                                         | 기능의 최초 구현과 후속 수정을 구분하여 기록                                                                                                                    |

상세 과정과 근거 커밋은 [작업 요약](docs/work-summary-20261013.md)을 확인하세요.

## 주요 화면과 이동 흐름

| 경로                                     | 기능                          | 접근           |
| ---------------------------------------- | ----------------------------- | -------------- |
| `/`                                      | 메인·행사 배너·상품 진열      | 공개           |
| `/products` / `/products/[id]`           | 상품 검색·목록·상세           | 공개           |
| `/vegetables/[id]`                       | 채소 정보·영양·보관·요리 연결 | 공개           |
| `/recipes` / `/recipes/[id]`             | 레시피 탐색·조리 순서         | 공개           |
| `/story` / `/story/[farm]`               | 농가 이야기·농가별 연결       | 공개           |
| `/promotions` / `/promotions/[slug]`     | 혜택·배송·체험 안내           | 공개           |
| `/login` / `/auth/callback`              | Google 로그인·인증 복귀       | 공개·인증 처리 |
| `/cart` / `/cart?tab=wishlist`           | 장바구니·찜                   | 로그인 필요    |
| `/cart/checkout`                         | 배송지·주문·결제 수단         | 로그인 필요    |
| `/mypage`                                | 프로필·기본 배송지            | 로그인 필요    |
| `/mypage/orders` / `/mypage/orders/[id]` | 주문 목록·상세                | 로그인 필요    |
| `/mypage/orders/[id]/refund`             | 본인 주문의 환불 신청         | 로그인 필요    |

상품 → 채소 정보 → 레시피 → 관련 상품으로 이동합니다. 개인 화면과 저장 행동은 로그인 후 이용하며, 비로그인 사용자는 인증 후 원래 요청한 화면으로 돌아옵니다.

## 기술 구성

| 구분         | 사용 기술                                      |
| ------------ | ---------------------------------------------- |
| 화면         | Next.js App Router / TypeScript / Tailwind CSS |
| 서버 처리    | Next.js Server Actions / Route Handlers        |
| 데이터베이스 | Supabase PostgreSQL                            |
| 인증·이미지  | Supabase Auth / Supabase Storage               |
| 검증·권한    | Zod / Supabase Row Level Security              |
| 배포         | Vercel                                         |
| 개발         | VS Code / Node.js 24.x / npm / Git / GitHub    |

**FastAPI나 별도 Python API 서버를 사용하지 않습니다.** 화면과 서버 처리를 하나의 Next.js 앱에서 운영합니다. Python은 자료 카탈로그 생성·검증 도구에 사용하며 앱 실행에 필요하지 않습니다.

## 로컬 실행

기본 관리 폴더는 `C:\dev\group_6_vegetable_project`입니다. 기존 저장소가 있다면 새로 복제하지 말고 미커밋 변경을 확인한 뒤 작업 브랜치를 동기화합니다.

처음 받는 경우:

```powershell
cd C:\dev
git clone https://github.com/KANT-2/group_6_vegetable_project.git
cd group_6_vegetable_project
npm ci
Copy-Item .env.example .env.local
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다. 이미 `.env.local`이 있으면 복사 명령으로 덮어쓰지 않습니다.

### 환경변수

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- 실제 DB·로그인·개인 기능에는 팀 Supabase URL과 공개 키가 필요합니다. 실제 값은 저장소에 올리지 않습니다.
- URL·공개 키가 없으면 공개 콘텐츠는 개발용 데이터로 확인할 수 있습니다. `USE_MOCK_DATA=true`도 공개 콘텐츠 개발에 사용할 수 있습니다.
- Google Client Secret은 Supabase 설정에 보관하며 팀원 PC에 넣지 않습니다.
- 접속 주소, `NEXT_PUBLIC_SITE_URL`, Supabase callback 허용 주소를 맞춥니다. 포트나 `localhost`/`127.0.0.1`을 바꾸면 인증 설정도 확인합니다.
- 환경변수 변경 후 서버를 재시작합니다. 포트가 사용 중이면 `npm run dev -- --port 3001`로 실행할 수 있으며 인증 callback도 해당 포트에 맞아야 합니다.

공유 DB에 초기 SQL을 무조건 다시 실행하거나 reset하지 않습니다. [DB 적용 기록](docs/database.md)과 [Google 로그인](docs/google-login.md)을 먼저 확인하세요.

## 폴더 구조

```text
src/
  app/           페이지·레이아웃·Route Handlers
  components/    공통·상품·채소·레시피·개인·주문·프로모션 UI
  actions/       인증·개인 데이터 변경 Server Actions
  services/      데이터 조회·변환
  schemas/       Zod 입력 검증
  lib/           Supabase·경로·가격·추천·사진 도우미
  context/       로그인·헤더 개인 상태
  types/         DB·화면 데이터 타입
  data/          콘텐츠·사진·행사 설정·개발용 데이터
public/          이미지·브랜드 정적 파일
supabase/
  migrations/    테이블·제약·RLS·주문 함수 변경
  seeds/         초기·공식 레시피 데이터
scripts/         자료 생성·검증 도구
tests/           인증·권한·주문·카탈로그·사진 검증
docs/            설계·설정·작업 기록·검수 화면·발표 자료
```

## 검증과 배포

PR 전에 변경 범위에 맞춰 검사합니다.

```powershell
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
```

입력 검증·로그인 복귀·사용자별 권한·가격·수량·배송비·주문 중복·사진 연결을 자동 검증합니다. 화면은 PC·모바일에서 이동·버튼·이미지·가로 넘침을 확인합니다. 자동 검사 통과가 실제 휴대폰과 운영 DB 검수를 대신하지 않습니다.

PR 리뷰 후 main에 병합합니다. Vercel Preview는 PR 확인용이고 운영 사이트는 main 병합 후 배포가 성공해야 바뀝니다. 환경변수·인증 callback은 환경별로 확인합니다.

권장 편집기는 VS Code이며 ESLint, Prettier, Tailwind CSS IntelliSense 확장을 사용합니다. 설치는 `npm ci`, 패키지 버전은 `package-lock.json`으로 통일합니다.

## 남은 작업

- 최신 앱 배포 후 로그인 계정에서 쿠폰 발급·새로고침·쿠폰함 흐름 확인.
- 쿠폰 선택·할인 계산·사용 처리를 주문 함수에 연결하고 조건을 서버에서 검증.
- 김장체험 운영 농가·장소·일정 확정과 예약·취소 기능.
- 실제 PG·배송 추적·환불 송금은 별도 운영 확장 범위.
- 서로 다른 실제 계정의 전체 개인 흐름과 실제 Android/iPhone 교차 검수.
- 외부 사진 사용 조건·실제 판매 데이터·영양·제철 자료의 운영 전 점검.

쿠폰 발급·보관의 조건과 DB 적용 상태는 [쿠폰 기능](docs/coupons.md)을 참고하세요.

## 상세 문서

| 내용                | 문서                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 전체 작업·기여 근거 | [작업 요약](docs/work-summary-20261013.md)                                                                                         |
| DB·서버             | [DB 기록](docs/database.md) / [최종 ERD](docs/ERD-current.md) / [백엔드](docs/backend.md)                                          |
| 인증·개인 기능      | [Google 로그인](docs/google-login.md) / [마이페이지](docs/mypage.md) / [장바구니](docs/cart.md) / [주문](docs/mock-payment.md)     |
| 레시피·영양         | [공식 카탈로그](docs/food-catalog.md) / [쉬운 레시피](docs/easy-recipes.md) / [영양](docs/nutrition.md)                            |
| 사진·브랜드         | [상품 사진](docs/product-photo-refresh.md) / [로고·갤러리](docs/logo-product-gallery.md) / [농가 사진](docs/farm-photo-sources.md) |
| 디자인              | [디자인 규칙](docs/design-guide.md) / [회원·결제](docs/account-checkout-renewal.md) / [주문 상세](docs/order-receipt-refresh.md)   |
| 행사·추천           | [프로모션](docs/home-promotions.md) / [추천 규칙](docs/market-motion-recommendations.md)                                           |
| 초기 상세 계획·설정 | [개발 가이드 보관본](docs/project-development-guide-archive.md)                                                                    |

과거 기능 문서는 작성 당시의 기록입니다. 최신 기능은 README와 작업 요약을 먼저 확인하고 DB 적용 상태는 적용 기록과 실제 연결 환경을 함께 확인합니다.

</details>
