> **2026-10-11 갱신:** 아래는 초기 구현 기록입니다. 공식 레시피 16개 연결과 현재 남은 작업은 [최신 A 작업 현황](progress-A-20261011.md)을 기준으로 확인하세요. 이 브랜치에는 기존 A 화면과 최신 main의 B 데이터·C 기반이 함께 있습니다.

# A(조영우) 작업 정리와 인계

작성 기준: 2026-10-08 · 브랜치 `feat/recipes` (`origin/main`의 B PR #7 합쳐진 뒤 기준)

A 담당 네 화면(메인 `/`, 농가 이야기 `/story`, 레시피 목록 `/recipes`, 레시피 상세 `/recipes/[id]`)을 PC·모바일에서 실행할 수 있게 구현했어요. 아직 PR·push는 하지 않았어요.

## 1. 실행 방법

Node.js 24.x, npm 기준이에요. (`.nvmrc` = 24)

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드
npm run lint
npm run typecheck
npm run format:check
```

- **환경변수 없이 바로 실행돼요.** Supabase 값이 없으면 자동으로 개발용 Mock 데이터를 써요. (`.env.example` 참고, 실제 값은 `.env.local`에만)
- `USE_MOCK_DATA=true` 로 두면 Supabase 값이 있어도 Mock만 써요.

### 선택한 버전

`create-next-app@16`을 임시 폴더에서 실행해 설정 파일만 가져왔어요. (README 13장 방식, 기존 파일 덮어쓰기 없음)

| 항목                | 버전                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| Next.js             | 16.4.0 (App Router, Turbopack, **Cache Components·Partial Prefetching 기본값 유지**) |
| React               | 19.3.0                                                                               |
| Tailwind CSS        | v4 (`@tailwindcss/turbopack`, `globals.css`의 `@theme`)                              |
| TypeScript / ESLint | 5.x / 9.x (flat config)                                                              |
| 추가 패키지         | `@supabase/supabase-js`, `zod`(4.x), `server-only`, 개발용 `prettier`                |

`AGENTS.md`는 Next.js가 자동 생성하는 파일이에요. "이 Next.js는 학습 데이터와 다르니 `node_modules/next/dist/docs`를 먼저 읽으라"는 안내가 들어 있어서 그대로 두었어요.

## 2. 만든 것

| 영역                    | 파일                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 화면                    | `src/app/page.tsx`, `story/page.tsx`, `recipes/page.tsx`, `recipes/[id]/page.tsx`, `error.tsx`, `not-found.tsx`                                    |
| 컴포넌트(A)             | `src/components/recipes/` — `RecipeCard`, `RecipeFilters`, `RecipeImage`, `RecipeMeta`, `RecipeIngredients`, `RecipeSteps`                         |
| 컴포넌트(공통, 임시)    | `src/components/common/` — 아래 3장 참고                                                                                                           |
| 조회·검색               | `src/services/recipes.ts` — `getRecipes`, `getRecipe`, `getRecipesByProduct`, `getRecipesByVegetable`, `getRecipeVegetableOptions`, `getRecipeIds` |
| 메인·이야기용 상품 조회 | `src/services/showcase.ts` — `getFeaturedProducts`, `getFarmStories`                                                                               |
| 검증(Zod)               | `src/schemas/recipe.ts`(URL 검색 조건, DB의 JSON 칸), `schemas/showcase.ts`                                                                        |
| 타입                    | `src/types/recipe.ts`, `types/showcase.ts` (B의 `Product`를 재사용)                                                                                |
| Mock                    | `src/data/mock/recipes.ts` — 레시피 7개 (B의 Mock 상품 id와 연결: B의 PR #7 상품 16개 중 재료가 맞는 것만)                                         |
| 설정                    | `src/lib/data-source.ts`(Mock/DB 선택), `lib/routes.ts`, `lib/storage.ts`, `lib/supabase/public.ts`                                                |
| DB                      | `supabase/migrations/20261008000100_recipes.sql`, `supabase/seeds/recipes.sql`                                                                     |
| 문서                    | `docs/design-guide.md`, 이 문서 (이미지 출처 표 `docs/image-sources.md`는 B가 작성)                                                                |

### 데이터 흐름

```
Server Component(page) → services/*.ts → Mock(src/data/mock) 또는 Supabase(공개 읽기, RLS)
```

- 페이지가 자기 앱의 `/api`를 다시 부르지 않고 `services`를 직접 호출해요. 그래서 이번 작업에는 Route Handler·Server Action이 **필요 없어서 만들지 않았어요.** (조회만 있고 변경 기능이 없어요.)
- 검색·필터는 주소(`/recipes?q=샐러드&vegetable=carrot`)로 유지돼요. 일반 `<form method="get">`과 링크라서 새로고침·뒤로 가기·링크 공유가 그대로 동작해요.
- **Mock ↔ DB 구분**: Supabase 환경변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)가 모두 있을 때만 DB를 써요. DB 요청이 실패하면 **Mock으로 바꾸지 않고** 공통 오류 화면(`error.tsx`)을 보여줘요. 원인은 서버 로그에만 남기고 화면에는 DB 내부 정보를 싣지 않아요. Mock 모드에서는 각 화면 위에 "개발용 예시 데이터" 안내가 보여요.
- 레시피는 수십 개 규모를 가정해 한 번에 읽고 서버에서 검색·필터해요. 수백 개 이상이 되면 DB 조건 조회로 바꿔요. (`services/recipes.ts` 머리말)
- Supabase 모드의 읽기에는 `use cache`(`cacheLife("minutes")`)를 써서 몇 분 동안 캐시돼요. 레시피를 DB에서 고친 뒤 바로 반영되지 않을 수 있어요.

## 3. C에게 — 공통 기반 변경 내역

C 담당인 공통 기반이 아직 없어서 **A 화면 실행에 필요한 최소한만** 만들었어요. 최종 코드는 C가 이어받아 주세요.

| 파일                                                                                                               | 내용                                                                                                                     | C가 할 일                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.nvmrc`, `AGENTS.md` | `create-next-app@16` 결과 + 검사 스크립트(`typecheck`는 `next typegen && tsc --noEmit`)                                  | 패키지는 C가 관리하므로 검토. `next.config.ts`는 이미지 `remotePatterns`를 쓰게 되면 추가                        |
| `.prettierrc.json`, `.prettierignore`, `.vscode/settings.json`, `.vscode/extensions.json`, `.env.example`          | 서식·VS Code·환경변수 예시                                                                                               | `.prettierignore`에 B 담당 파일 5개가 임시로 들어 있어요(B가 서식을 맞추면 삭제)                                 |
| `src/app/layout.tsx`                                                                                               | 한국어 `lang`, 메타데이터, 본문 바로가기, 헤더·푸터 배치                                                                 | Provider(로그인·장바구니 상태) 연결                                                                              |
| `src/components/common/SiteHeader.tsx`, `NavLinks.tsx`, `MobileMenu.tsx`                                           | 로고 + 메뉴(홈·레시피·농가 이야기, 상품 준비 시 전체 상품). 모바일은 햄버거 패널(열기·Esc 닫기·이동 시 닫힘·포커스 복귀) | 개인 메뉴(장바구니·마이페이지·로그인 상태) 추가. 검색·장바구니 아이콘은 **동작하지 않아서 일부러 넣지 않았어요** |
| `src/components/common/SiteFooter.tsx`                                                                             | 푸터. 목업의 고객센터 번호·무료배송 문구는 팀이 정하지 않아 제외                                                         | 필요하면 정책 문구 추가                                                                                          |
| `src/lib/supabase/public.ts`                                                                                       | 로그인 없이 읽는 공개 조회용 연결(publishable key, 세션 없음)                                                            | 로그인용 `server.ts`/`client.ts`(`@supabase/ssr`)는 C가 별도로. 필요하면 합쳐도 돼요                             |
| `src/lib/storage.ts`                                                                                               | `getStorageImageUrl(path)` — `market-images` 버킷 공개 주소                                                              | C의 Storage 공통 규칙과 맞는지 확인                                                                              |
| `src/components/common/` 의 `Icons`, `SafeImage`, `ProductPreviewCard`, `MockDataNotice`                           | 아이콘, 이미지 실패 대비 `<img>`, 간단한 상품 카드, Mock 안내                                                            | 공통 버튼·EmptyState는 아직 없음. 필요하면 `.btn`·`.card`(globals.css)를 컴포넌트로 감싸세요                     |

이미지는 로컬 파일과 Supabase Storage 주소를 모두 쓰고 실패 시 대체 화면이 필요해서 `next/image` 대신 `<img>`를 썼어요. `next/image`로 바꾸려면 `next.config.ts`에 Supabase 호스트 `remotePatterns`가 필요해요.

## 4. B에게 — 상품·채소 연결

A 화면은 B의 **타입과 Mock 데이터를 그대로 재사용**했어요. (`Product`, `UGLY_REASON_LABELS`, `formatPrice`, `getDiscountRate`, `src/data/mock/products.ts`, `vegetables.ts`) B 파일은 수정하지 않았어요.

B의 화면이 `main`에 합쳐지면 `src/lib/routes.ts` 맨 위의 값을 `true`로 바꿔 주세요. 그러면 아래 연결이 한 번에 켜져요. (없는 경로로 링크가 걸리지 않도록 지금은 `false`예요.)

| 값                | 켜지면 생기는 것                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `productList`     | 헤더 "전체 상품", 메인 "상품 보기"·"전체 보기", 이야기 "채소 만나보기"                                                                                |
| `productDetail`   | 메인 추천 상품·레시피 상세 "이 요리에 쓰는 못난이 농산물"·이야기의 농산물 꼬리표가 `/products/[id]` 링크가 됨(지금은 "상품 상세 페이지 준비 중" 표시) |
| `vegetableDetail` | 메인 "채소로 레시피 찾기"가 "어떤 채소를 찾으세요?"로 바뀌고 `/vegetables/[id]` 링크가 됨                                                             |

- 상품 상세·채소 정보에서 관련 요리를 보여줄 때는 `getRecipesByProduct(productId)`, `getRecipesByVegetable(vegetableId)`와 `RecipeCard`를 쓰세요. 두 함수는 `Recipe[]`를 돌려줘요.
- `src/services/showcase.ts`의 `getFeaturedProducts`/`getFarmStories`는 B의 `getProducts` 등이 생기기 전 임시 조회예요. B 함수로 바꿔 끼우고 이 파일은 지워도 돼요. `ProductPreviewCard`도 B의 `ProductCard`로 교체할 수 있어요.
- 레시피 연결 키는 `recipe_products.product_id` → `products.id` 예요. 상품 id를 바꾸면 `src/data/mock/recipes.ts`의 `productIds`와 `supabase/seeds/recipes.sql`도 같이 바꿔야 해요.

## 5. DB (아직 어디에도 적용하지 않음)

- `supabase/migrations/20261008000100_recipes.sql`: `recipes`, `recipe_products`, 인덱스, **공개 읽기 전용 RLS**(anon/authenticated는 select만, 쓰기 권한 없음).
- **B의 catalog migration(vegetables·products)이 먼저 적용되어야 해요.** B의 파일 시각이 더 늦으면 이 파일 이름의 시각을 그 뒤로 바꿔 주세요. 공유 DB 적용은 README 8장대로 C가 해요.
- `supabase/seeds/recipes.sql`은 Mock과 같은 레시피 7개예요. 여러 번 실행해도 중복되지 않아요. Mock 내용을 바꾸면 seed도 같이 고쳐야 해요.
- ERD v3 `recipes`의 `description`, `cook_time_min`, `difficulty`, `servings`, `ingredients`, `steps`, `image_path`를 그대로 따랐어요. ERD의 "text + CHECK vs enum" 미결정 항목은 **CHECK로** 구현했어요(확정 시 변경).

## 6. 검증 결과

실행 환경: Windows 11, Node 24.20, Chromium 계열 내장 브라우저. **실제 휴대폰(Android Chrome·iPhone Safari)은 확인하지 못했어요.**

| 항목                                   | 결과                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint` / `typecheck` / `build` | 통과 (build: 정적 페이지 + 레시피 상세 7개 미리 생성)                                                                                                                                |
| 폭 360 / 390 / 768 / 1280              | 가로 스크롤 없음, 이미지 깨짐 없음. 레시피 카드 1열(모바일)·2열(태블릿)·3열(데스크톱)                                                                                                |
| 터치 영역                              | 360px에서 네 화면 모두 44px 미만 링크·버튼·입력 없음. (처음 측정에서 상세의 빵부스러기 링크 2곳이 미달이어서 고친 뒤 다시 측정)                                                      |
| 검색·필터                              | 검색어 `샐러드` → 2개, 채소 `당근` 추가 → 1개(검색어 유지), 결과 없음 화면·초기화 링크, 잘못된 값(`q=\0`, 중복 매개변수)도 200으로 안전하게 처리                                     |
| 404                                    | 없는 id·형식이 잘못된 id → **HTTP 404** + 안내 화면 + `noindex`                                                                                                                      |
| 모바일 메뉴                            | 열기·닫기, Esc, 링크 이동 시 닫힘, 현재 페이지 표시 확인                                                                                                                             |
| 키보드                                 | Tab 순서 첫 항목 "본문 바로가기"→로고, 3px 초록 포커스 링 확인                                                                                                                       |
| 색 대비                                | 모든 글자/배경 조합 4.5 : 1 이상 (`docs/design-guide.md` 표)                                                                                                                         |
| SQL                                    | PGlite(임베디드 Postgres)에서 migration + seed 두 번 실행: 레시피 7개·연결 11개(중복 없음), anon 쓰기 거부, 제약조건 위반 거부 확인                                                  |
| Supabase 모드                          | 가짜 PostgREST 서버로 코드 경로 확인: 데이터가 DB 응답에서 오고 Storage 이미지 주소가 만들어지며 Mock 안내가 사라짐. 500 오류·JSON 형태 불일치 시 **Mock으로 바뀌지 않고** 오류 화면 |

## 7. 알려진 한계·확인 필요

- **진짜 Supabase 프로젝트로는 확인하지 못했어요.** 환경변수·DB가 없어서 위처럼 가짜 서버로만 검증했어요. 실제 PostgREST의 중첩 select(`recipe_products(products(vegetables(...)))`) 응답 모양은 DB 연결 후 한 번 확인해 주세요. 어긋나면 Zod가 오류로 알려줘요.
- 레시피 **요리 사진이 없어요.** 재료(채소) 사진이 임시로 보이고 "재료 사진 · 요리 사진 준비 중" 꼬리표로 밝혔어요. 요리 사진을 준비하면 사용 조건을 확인해 B의 `docs/image-sources.md`에 출처를 적고, Mock은 `src/data/mock/recipes.ts`에 `imageUrl: "/images/recipes/<레시피id>.jpg"`(파일은 `public/images/recipes/`), Supabase는 Storage `market-images/recipes/`에 올린 뒤 `recipes.image_path`를 채워요.
- 상품 이미지 출처는 B의 `docs/image-sources.md`에 정리돼 있어요.
- 레시피·농가 문구는 개발용 예시예요. 레시피는 일반적인 가정식으로 새로 적었고 팀 확정 전 검수가 필요해요. 농가 이름·이야기는 B의 Mock 상품 데이터(가상)를 그대로 쓰며, 실존 농가·인증·인터뷰는 만들지 않았어요.
- Supabase 모드에서는 `next build` 때 레시피 id 목록을 DB에서 읽어요. 빌드 환경에서 DB에 접근할 수 없으면 빌드가 실패해요. (목록에 없는 새 id는 요청 때 렌더링돼요.)
- 레시피 상세는 진짜 404 상태 코드를 위해 `params`를 Suspense로 감싸지 않아서 `export const instant = false`로 개발용 "instant navigation" 안내를 껐어요.
- 자동 테스트 코드는 아직 없어요(수동·스크립트 확인만). 검색 조건 파싱·필터는 후속으로 단위 테스트를 추가하기 좋아요.
- `format:check`: B 담당 파일 5개는 서식이 달라 `.prettierignore`로 제외했어요(그 파일들은 수정하지 않았어요).

## 8. 문서 간 이름 확인

- 서비스명은 README·목업·와이어프레임·회의록 모두 **"못난이마켓"** 이에요. 화면에도 이 이름만 썼어요.
- **"못난이이야기"** 는 저장소 문서·목업 어디에도 없어요. 팀은 "6조"로 부르고(Redmine "6팀"), 목업 푸터에는 "Team 못난이"가 있어요. README에는 별도의 팀 이름이 없어요.
- 목업 상단 "첫 구매 무료배송 · 산지에서 바로 보내드려요", "배송 산지 직송 · 내일 도착", 고객센터 1588-0000은 배송·운영 정책이라 A 화면에 옮기지 않았어요. 목업의 "가치소비" 메뉴와 하단 탭바(장바구니·마이)도 해당 화면이 없어서 넣지 않았어요.
- 이야기 화면 이름: 목업 메뉴는 "농가 이야기", README 표는 "이야기"예요. 메뉴·제목은 "농가 이야기"로 통일했어요.

## 9. B의 상품 Mock 확장(PR #7)과 맞춘 내용

- B가 상품 10개·채소 6종·이미지 10장을 추가했어요. A 화면은 **그대로 호환**돼요. 임시로 합쳐서 메인·농가 이야기·레시피 목록·상세를 확인했고 오류·깨진 이미지·가로 스크롤은 없었어요.
- 농가가 15곳으로 늘어 `/story`가 폰에서 1만 px 넘게 길어져서, **처음 6곳만 보이고 나머지는 "농가 N곳 더 보기"로 접어요**(`<details>`, 자바스크립트 불필요). 합친 상태에서 약 11,400px → 6,700px.
- 레시피 연결은 재료에 실제로 들어간 채소의 새 상품만 추가했어요: 당근 라페·당근 수프·당근 케이크 ↔ `carrot-irregular-3kg`, 사과 양배추 샐러드 ↔ `apple-small-3kg`, 표고버섯 간장 볶음 ↔ `green-onion-small-1bunch`(대파). 그래서 레시피 목록의 채소 필터에 **대파**가 추가돼요. 이 상품 id들은 B의 PR #7이 합쳐져야 존재하며, 그전에는 화면이 없는 상품을 건너뛰어요. Supabase 시드(`recipes.sql`)는 B의 catalog seed에 이 id들이 있어야 적용돼요.
- 감자·고구마·토마토·오이·시금치 상품에는 아직 연결된 레시피가 없어요. 레시피를 새로 만들지, 공식 카탈로그(PR #6, `data/food-catalog`)의 레시피를 가져올지는 "판매 채소 기준 정하기"와 함께 팀이 정해야 해요.
