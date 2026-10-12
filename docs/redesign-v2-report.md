# 디자인 개편 v2 보고서 (마켓컬리 기준)

- 작성: A 조영우 · 2026-10-12
- 브랜치: `feat/a-redesign-sample` → `main` (리뷰 후 머지)
- 상세 규칙: [design-system-v2.md](design-system-v2.md)

## 1. 왜 바꿨나요

중간 평가에서 다음 의견을 받았습니다.

- "디자인과 사용 편의성이 낮다"
- "못난이 농산물이라도 사진이 너무 거칠다(터프하다)"

어글리어스, 농협몰, 농사랑, 강원더몰을 비교한 뒤 **마켓컬리**를 최종 기준으로 정했습니다. 컬리 메인을 직접 측정해 배치, 글꼴, 카드 크기를 맞췄습니다(본문 폭 1050px, 카드 249×320, 제목 28px 등).

## 2. 무엇이 바뀌었나요

| 영역        | 전                        | 후                                                                                                |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| 글꼴        | 시스템 글꼴               | **Pretendard** (컬리와 같은 글꼴, 무료 공개)                                                      |
| 색          | 크림 배경 + 진한 초록     | 흰 바탕 + **테라코타(갈색과 주황 사이) `#B4541F`**                                                |
| 헤더        | 로고·메뉴·로그인 한 줄    | 컬리식 3단: 회원 메뉴 / 로고·**가운데 검색창**·찜·장바구니 / `☰ 카테고리` + 메뉴. 휴대폰은 탭 줄 |
| 메인        | 큰 카드 배너 + 고정 격자  | 화면 너비 사진 배너 + **기획전 진열 줄 6개**(4개씩 넘기기) + 띠 배너                              |
| 상품 카드   | 둥근 카드, 정사각 사진    | 컬리식: 세로 사진 → **[담기]** → [농가] 이름 → 정가 취소선 → 할인율·가격 → 후기 수                |
| 농가 이야기 | 한 페이지에 긴 카드 나열  | 농가 카드 목록 → **농가별 상세 페이지**(판매 상품, 구글 지도, 요리, 다른 농가)                    |
| 버튼·모서리 | 알약 모양 버튼, 둥근 카드 | 4px 각진 버튼, 8px 카드                                                                           |
| 사진        | 흙·어두운 배경·접사       | 상품 사진 28장을 밝은 사진으로 교체(파일 이름 같음 → DB 수정 없음)                                |
| 푸터        | 로고와 안내 한 줄         | 왼쪽 소개 / 오른쪽 바로가기 / 아래 안내 줄                                                        |

### 새 기능: 농가 상세 `/story/[농가 이름]`

- 농가 사진, 소개, 한눈에 보기(지역 · 주요 농산물 · 판매 상품 수 · 후기 수)
- 탭: 판매 상품 | 농가 위치 | 이 채소로 만드는 요리 (스크롤해도 위에 붙어 있음)
- **판매 상품**: 이 농가의 상품 전체를 컬리식 카드와 [담기]로 보여줌
- **농가 위치**: 구글 지도를 페이지 안에 띄우고, "Google 지도에서 열기" 링크 제공
  - 시연용 가상 농가라 정확한 주소 대신 **지역**을 표시함(예: 경상북도 영주)
- 다른 농가 이야기 줄
- 연결된 곳: 메인 농가 줄, 농가 이야기 목록, **상품 상세의 "농가 이야기" 상자**

### 새 기능: 카드 [담기]

- 수량 선택 없이 1개를 바로 담음
- 장바구니 기능은 C의 `addToCart`를 그대로 사용
- 로그인 전에 누르면 로그인 화면으로 갔다가 원래 화면으로 돌아옴

## 3. 담당자별 확인 요청

### B 심우섭 (상품·채소)

- [ ] 상품 목록·기획전 카드가 컬리식 카드로 바뀌었습니다.
  - `ProductCard`는 같은 이름·같은 props로 유지하고, 안에서 공통 카드를 그립니다.
  - 정렬·필터·검색 동작은 그대로입니다.
- [ ] 상품 목록의 검색창은 헤더 가운데로 옮겼습니다. 검색 주소(`/products?q=`)는 같습니다.
- [ ] 상품 상세 "농가 이야기" 상자에 농가 상세 링크를 추가했습니다.
- [ ] 바뀐 상품 사진 28장을 확인해 주세요. 이후 사진 작업은 맡아 주신 분 기준으로 진행합니다.

### C 이상재 (인증·장바구니·공통)

- [ ] `SiteHeader`, `NavLinks`, `SiteFooter`를 컬리식으로 바꿨습니다.
  - 로그인 상태, 장바구니 개수, 로그아웃은 기존 `useNavigation`·`signOut`을 그대로 씁니다.
  - `MobileMenu`·`PersonalMenu`는 수정하지 않았습니다.
- [ ] 헤더에 찜 아이콘(`/cart?tab=wishlist`)을 추가했습니다. 회원가입 링크는 `/login`으로 갑니다(Google 로그인 시 계정 생성).
- [ ] 카드 [담기]가 실제 로그인 상태에서 잘 담기는지 확인해 주세요.

### 공통

- [ ] 실제 휴대폰과 Vercel Preview 화면에서 확인
- [ ] 리뷰 후 main 머지 여부 결정

## 4. 검증 결과 (로컬 Mock 모드)

- `npm run lint` / `typecheck` / `format:check` / `build` 통과
- `npm test` 50개 통과 (농가 상세 주소·지역 정보 테스트 3개 추가)
- localhost에서 확인한 것
  - PC 1280px, 휴대폰 390px에서 가로로 넘치지 않음
  - 메인, 상품 목록·상세, 레시피 목록·상세, 채소, 농가 이야기·상세, 로그인 화면이 새 디자인으로 표시됨
  - 농가 상세의 구글 지도가 표시됨(영주 사과마을 → 경상북도 영주)
  - 로그인 전 [담기] → 로그인 화면 → 원래 화면으로 돌아오는 흐름

**확인하지 못한 것**: 실제 공유 Supabase 데이터, 실제 휴대폰, Vercel 배포 화면, 로그인한 상태의 [담기]

## 5. 화면 캡처

- 메인 PC: [screenshots/redesign-v2-desktop.png](screenshots/redesign-v2-desktop.png)
- 메인 휴대폰: [screenshots/redesign-v2-mobile.png](screenshots/redesign-v2-mobile.png)
- 농가 상세: [screenshots/redesign-v2-farm-detail.png](screenshots/redesign-v2-farm-detail.png)
- 상품 목록: [screenshots/redesign-v2-products.png](screenshots/redesign-v2-products.png)

## 6. 바뀐 파일

- 공통 규칙: `src/app/globals.css`, `src/app/layout.tsx`(Pretendard), `package.json`(`pretendard` 1.3.9)
- 헤더·푸터: `src/components/common/SiteHeader.tsx`, `NavLinks.tsx`, `SiteFooter.tsx`, 새 파일 `HeaderAccount.tsx`, `HeaderIcons.tsx`
- 메인: `src/app/page.tsx`, 새 파일 `HomeBanner.tsx`, `HomeShelf.tsx`
- 카드: `src/components/common/ProductPreviewCard.tsx`, 새 파일 `QuickAddButton.tsx`, `src/components/products/ProductCard.tsx`, `ProductSection.tsx`
- 농가: `src/app/story/page.tsx`, 새 파일 `src/app/story/[farm]/page.tsx`, `src/lib/routes.ts`(`routes.farm`)
- 상품: `src/app/products/page.tsx`(검색창 헤더로 이동), `src/app/products/[id]/page.tsx`(농가 상세 링크)
- 사진·문서: `public/images/*.jpg` 28장, `docs/image-sources.md`, `docs/design-system-v2.md`, 이 보고서, `tests/farm-detail.test.mjs`
