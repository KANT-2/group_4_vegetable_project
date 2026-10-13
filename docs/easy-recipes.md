# 채소별 레시피 카탈로그

2026-10-13, C 이상재. 현재 표시되는 카탈로그 기준입니다.

## 구성

전체 판매 품목 21종에 각각 4개, 총 84개를 제공합니다. 기존 메뉴 13종만 기준으로 삼아 빠졌던 새송이버섯·고구마·대파·배추·단호박·고추·사과·귤에도 4개씩 추가했습니다. 감자 4개와 사용자 제공 사진은 유지했습니다. 나머지 80개는 원작자 레시피에서 재료·분량·조리 과정을 대조하고 한국어로 편집했습니다.

원본은 `src/data/easy-recipes.json`입니다. 기존 공식 레시피 16개는 DB·시드·원본 JSON을 보존하고 `src/data/retired-recipe-ids.json`으로 목록·검색·상세에서 제외합니다. 그 밖의 새 DB 레시피는 유지합니다. 현재 데이터는 배포 파일에 포함되므로 공용 DB에 SQL을 추가 적용할 필요가 없습니다.

## 분류와 상품 연결

`primaryVegetableId`로 주재료를 분류합니다. 양파가 양념에 들어간 당근 수프는 당근 탭에만 표시합니다. 재료에 포함된 보조 채소는 판매 상품 연결에 사용할 수 있습니다. Mock에서는 Mock 상품, Supabase에서는 실제 판매 중인 상품 ID를 연결합니다. 상품이 없어도 레시피는 유지합니다. 필터는 웹·모바일 모두 가로 텍스트 탭이며 URL에 선택 상태가 남습니다.

## 시간·분량

시간은 준비와 조리를 합친 예상 분입니다. 원문 시간이 없거나 절이기·재우기와 합계가 맞지 않으면 원문 과정에 맞춰 편집 추정했습니다. 직접 조리 실측은 하지 않았습니다. 김치의 하루 이상 숙성, 치즈의 별도 준비는 설명에서 구분합니다. 1큰술은 15ml, 1작은술은 5ml, 미국식 1컵은 약 240ml로 편집했습니다. 원문이 250ml 컵 기준의 ml를 직접 제시한 경우 그 값을 유지합니다.

반찬 인분은 원문의 작은 반찬 분량을 유지합니다. 프렌치 양파딥 2.25컵은 8인분, 브로콜리전 6개는 2인분, 브루스케타 12조각은 6인분, 오이소박이 5개는 5인분으로 편집한 나눔 기준입니다. 파니르 1배치는 별도 원문의 전지우유 2L·레몬즙 4큰술로 만드는 양입니다. [파니르 준비 원문](https://www.recipetineats.com/how-to-make-paneer-fresh-indian-cheese/)을 참고합니다.

## 사진과 표시

각 레시피에 사진 3장을 연결했습니다. 기존 감자 12장과 나머지 240장입니다. 원작자 본문의 같은 요리 사진을 선정하고 20종의 사진 검수표로 시각 확인했습니다. 일부는 조리 중 사진이나 같은 구도의 근접 사진입니다. 음식과 관계없는 생채소·다른 요리·조리 콜라주는 제외했습니다.

Pinterest 직접 접속이 연결 오류로 막혀 이전에 사용자가 허용한 원작자 사이트 방식으로 가져왔습니다. Pinterest에서 직접 내려받았다고 표시하지 않습니다. 원본 URL·작가·규격·SHA-256·원문 시간/분량은 `docs/recipe-catalog-sources-20261012.json`(48개)과 `docs/recipe-catalog-sources-20261013.json`(추가 32개)에 기록했습니다. 원작자 사진을 CC 또는 허가 확인 이미지로 표기하지 않습니다.

목록은 사진만 2초 간격·0.7초 페이드로 전환합니다. 동작 줄이기 설정과 백그라운드 탭에서는 자동 전환을 멈춥니다. 상세는 제목과 고정 사진 3장을 표시하고 마우스 올리기·모바일 탭으로 확대합니다. 화면 밖 카드 사진은 지연 로딩합니다.

## 요리 목록과 원문

| 채소     | 요리                       | 원문                                                                                                                                                           |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 감자     | 감자채볶음                 | 기존 편집본·사용자 사진 유지                                                                                                                                   |
| 감자     | 감자 간장조림              | 기존 편집본·사용자 사진 유지                                                                                                                                   |
| 감자     | 감자전                     | [Korean Bapsang · Hyosun](https://www.koreanbapsang.com/gamjajeon-potato-pancakes/)                                                                            |
| 감자     | 회오리 감자                | [Tasty · Merle O’Neal](https://tasty.co/recipe/tornado-potato)                                                                                                 |
| 당근     | 당근 라페                  | [Incredible, Simple French Carrot Salad](https://www.recipetineats.com/carrot-salad-with-honey-dijon-dressing/)                                                |
| 당근     | 당근 수프                  | [Creamy Carrot Soup](https://www.recipetineats.com/carrot-soup/)                                                                                               |
| 당근     | 오븐 당근구이              | [Great Roasted Carrots](https://www.recipetineats.com/great-roasted-carrots/)                                                                                  |
| 당근     | 버터 당근조림              | [Nagi and JB](https://www.recipetineats.com/french-glazed-carrots-carottes-vichy-recipe/)                                                                      |
| 애호박   | 애호박전                   | [Hyosun](https://www.koreanbapsang.com/hobak-jeon-pan-fried-zucchini-in-egg-batter/)                                                                           |
| 애호박   | 애호박볶음                 | [Hyosun](https://www.koreanbapsang.com/hobak-bokkeum-stir-fried-zucchini/)                                                                                     |
| 애호박   | 애호박 채전                | [Hyosun](https://www.koreanbapsang.com/hobak-buchim-zucchini-pancakes/)                                                                                        |
| 애호박   | 애호박 고추장찌개          | [Hyosun](https://www.koreanbapsang.com/hobak-gochujang-jjigae-korean-spicy/)                                                                                   |
| 가지     | 가지나물                   | [Hyosun](https://www.koreanbapsang.com/gaji-namul-steamed-eggplant-side-dish/)                                                                                 |
| 가지     | 매콤 가지볶음              | [Hyosun](https://www.koreanbapsang.com/gaji-bokkeum-stir-fried-eggplant-side-dish/)                                                                            |
| 가지     | 오븐 가지구이              | [Oven roasted eggplant (aubergine)](https://www.recipetineats.com/roasted-eggplant/)                                                                           |
| 가지     | 요거트소스 가지구이        | [Nagi                                                                                                                                                          | RecipeTin Eats](https://www.recipetineats.com/grilled-eggplant-with-yoghurt-sauce/) |
| 양파     | 양파김치                   | [Hyosun](https://www.koreanbapsang.com/yangpa-kimchi-onion-kimchi/)                                                                                            |
| 양파     | 프렌치 양파수프            | [Nagi                                                                                                                                                          | RecipeTin Eats](https://www.recipetineats.com/french-onion-soup/)                   |
| 양파     | 캐러멜 양파볶음            | [How to Make Caramelized Onions](https://www.spendwithpennies.com/caramelized-onions/)                                                                         |
| 양파     | 프렌치 양파딥              | [Nagi                                                                                                                                                          | RecipeTin Eats](https://www.recipetineats.com/homemade-french-onion-dip/)           |
| 양배추   | 양배추 샐러드              | [Everyday Cabbage Salad](https://www.recipetineats.com/everyday-cabbage-salad/)                                                                                |
| 양배추   | 양배추김치                 | [Hyosun](https://www.koreanbapsang.com/yangbaechu-kimchi-green-cabbage-kimchi/)                                                                                |
| 양배추   | 양배추 코울슬로            | [Nagi                                                                                                                                                          | RecipeTin Eats](https://www.recipetineats.com/coleslaw/)                            |
| 양배추   | 양배추 당근 코코넛샐러드   | [Cabbage and Carrot Thoran-style Salad (Indian Salad)](https://www.recipetineats.com/cabbage-carrot-thoran-style-indian-salad/)                                |
| 오이     | 매콤 오이무침              | [Hyosun](https://www.koreanbapsang.com/oi-muchim-korean-style-cucumber-salad/)                                                                                 |
| 오이     | 오이소박이                 | [Hyosun](https://www.koreanbapsang.com/oi-sobagi-stuffed-cucumber-kimchi/)                                                                                     |
| 오이     | 중국식 두드린 오이무침     | [Smashed Cucumber Salad](https://www.recipetineats.com/smashed-cucumber-salad/)                                                                                |
| 오이     | 오이 요거트샐러드          | [Creamy Cucumber Salad with Lemon Yogurt Dressing](https://www.recipetineats.com/creamy-cucumber-salad-lemon-yogurt-dressing/)                                 |
| 시금치   | 시금치나물                 | [Hyosun](https://www.koreanbapsang.com/sigeumchi-namul-korean-spinach-side/)                                                                                   |
| 시금치   | 마늘 시금치볶음            | [Garlic Sautéed Spinach](https://www.recipetineats.com/garlic-sauteed-spinach/)                                                                                |
| 시금치   | 시금치 치즈커리            | [Palak Paneer – Indian Spinach Curry with Homemade Fresh Cheese](https://www.recipetineats.com/palak-paneer-indian-spinach-curry-with-cheese/)                 |
| 시금치   | 시금치 리코타 파스타       | [Nagi                                                                                                                                                          | RecipeTin Eats](https://www.recipetineats.com/spinach-ricotta-pasta-bake/)          |
| 브로콜리 | 마늘 브로콜리구이          | [Nagi                                                                                                                                                          | RecipeTin Eats](https://www.recipetineats.com/magic-broccoli/)                      |
| 브로콜리 | 브로콜리 치즈수프          | [Nagi                                                                                                                                                          | RecipeTin Eats](https://www.recipetineats.com/easy-broccoli-cheese-soup/)           |
| 브로콜리 | 브로콜리전                 | [Nagi                                                                                                                                                          | RecipeTin Eats](https://www.recipetineats.com/broccoli-fritters/)                   |
| 브로콜리 | 마늘·커민 브로콜리샐러드   | [New York Times Famous Broccoli Salad - with Cumin, Garlic and Sesame](https://www.recipetineats.com/ny-times-famous-broccoli-salad-with-sesame-cumin-garlic/) |
| 무       | 무생채                     | [Hyosun](https://www.koreanbapsang.com/mu-saengchae-spicy-korean-radish-salad/)                                                                                |
| 무       | 무나물                     | [Three Color Vegetables (Samsaek Namul) – White](https://kimchimari.com/three-color-vegetables-white/)                                                         |
| 무       | 소고기 뭇국                | [Hyosun](https://www.koreanbapsang.com/korean-radish-soup-mu-gukmoo-guk/)                                                                                      |
| 무       | 깍두기                     | [Hyosun](https://www.koreanbapsang.com/kkakdugi-cubed-radish-kimchi/)                                                                                          |
| 표고버섯 | 표고버섯구이               | [Roasted Shiitake Mushrooms Recipe](https://foolproofliving.com/roasted-shiitake-mushrooms/)                                                                   |
| 표고버섯 | 표고버섯볶음               | [Shiitake Mushrooms Recipe](https://foolproofliving.com/shiitake-mushrooms-recipe/)                                                                            |
| 표고버섯 | 표고버섯 크림수프          | [Shiitake Mushroom Soup Recipe](https://foolproofliving.com/shiitake-mushroom-soup/)                                                                           |
| 표고버섯 | 바삭한 표고버섯 베이컨     | [Minimalist Baker](https://minimalistbaker.com/quick-crispy-shiitake-bacon/comment-page-1/)                                                                    |
| 토마토   | 토마토 달걀볶음            | [Maggie Zhu](https://omnivorescookbook.com/classic-tomato-and-egg-stir-fry/comment-page-1/)                                                                    |
| 토마토   | 토마토 바질샐러드          | [My favourite Tomato Salad](https://www.recipetineats.com/my-favourite-tomato-salad/)                                                                          |
| 토마토   | 오븐 토마토수프            | [Smoky Roasted Tomato Soup](https://www.recipetineats.com/smoky-roasted-tomato-soup/)                                                                          |
| 토마토   | 토마토 바질 브루스케타     | [Bruschetta](https://www.cookingclassy.com/bruschetta-recipe/)                                                                                                 |
| 파프리카 | 파프리카 양파볶음          | [Sauteed Peppers and Onions](https://www.isabeleats.com/sauteed-peppers-and-onions/)                                                                           |
| 파프리카 | 파프리카 샐러드            | [Bell Pepper Salad](https://www.themediterraneandish.com/bell-pepper-salad-with-mini-sweet-peppers/)                                                           |
| 파프리카 | 멕시칸 파프리카 라이스구이 | [Mexican Stuffed Peppers](https://www.recipetineats.com/mexican-stuffed-peppers/)                                                                              |
| 파프리카 | 구운 파프리카 크림파스타   | [Creamy Goat Cheese & Roasted Red Pepper Risoni (Orzo)](https://www.recipetineats.com/creamy-goat-cheese-roasted-red-pepper-risoni-orzo/)                      |

## 검증

전체 판매 품목별 4개·총 84개, 주재료 분량, 사진 3장 파일, 대표 사진 중복, 비활성 상품 제외, 양념 채소 필터 제외, DB/Mock 통합과 이전 목록 제외를 테스트합니다. 실제 조리 검수는 포함하지 않습니다.

이전 확인(2026-10-12): 테스트 52개·lint·typecheck·format:check·build 통과. Supabase 연결 로컬 화면에서 13개 채소 탭 각각 4개, 전체 52개를 확인했습니다. 애호박 목록 사진 12장 로딩·2초 페이드와 상세 고정 사진 3장·클릭 확대·재료/조리법/예상 시간 안내를 확인했습니다.

## 2026-10-13 전체 품목 확장

판매 품목과 주재료 필터의 ID 집합을 비교하여 누락을 검사합니다. 84개 ID·대표 사진 중복, 품목별 4개, 판매 상품 연결, 각 사진 파일과 출처 SHA-256도 검사합니다. 기존 52개와 감자 사진은 유지합니다.

대파는 쪽파김치 대신 잘게 썬 대파를 사용하는 중국식 파전을 선정했습니다. 가는 파를 쓰는 원문의 파전·국수는 굵은 대파를 가늘게 써는 방법을 안내합니다. 고추구이 원문 사진은 순한 애너하임 고추이며 품종 차이를 설명했습니다. 귤 원문의 클레멘타인도 설명에 표시했습니다.

단호박 샐러드는 냉장 1시간을 포함해 95분, 단호박죽은 찹쌀 불리기를 포함해 120분으로 편집했습니다. 귤 소르베는 두 차례 냉동 약 8시간을 포함한 490분 추정치입니다. 고추 절임의 3일~1주일 숙성은 준비 시간과 분리해서 설명합니다. 배추 겉절이는 절이기 40~60분을 포함한 80분·반찬 8인분 편집 기준입니다. 배추전 12장은 4인분, 고구마 스택 12개는 6인분, 고추전 약 20조각은 5인분, 중국식 파전 6장은 12인분으로 나누는 기준입니다.

### 추가 원문

| 품목       | 요리                 | 원문                                                                                                                                    |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 새송이버섯 | 새송이 마늘버터구이  | [Zestful Kitchen · Lauren Grant](https://zestfulkitchen.com/pan-fried-king-oyster-mushrooms-recipe/)                                    |
| 새송이버섯 | 새송이 매콤 간장볶음 | [Maggie Zhu](https://omnivorescookbook.com/king-oyster-mushroom-stir-fry/)                                                              |
| 새송이버섯 | 새송이 버섯 스캘럽   | [Sweet Potato Soul · Jenne Claiborne](https://sweetpotatosoul.com/king-oyster-mushroom-vegan-scallops/)                                 |
| 새송이버섯 | 새송이 마늘파스타    | [The Vegan Larder · Louise-Claire Cayzer](https://theveganlarder.com/vegan-scallops-with-garlic-pasta-king-oyster-mushroom/)            |
| 고구마     | 고구마 수프          | [RecipeTin Eats · Nagi Maehashi](https://www.recipetineats.com/sweet-potato-soup/)                                                      |
| 고구마     | 구운 고구마샐러드    | [Nagi                                                                                                                                   | RecipeTin Eats](https://www.recipetineats.com/roasted-sweet-potato-salad-honey-lemon-dressing/) |
| 고구마     | 고구마 스테이크      | [RecipeTin Eats · Nagi Maehashi](https://www.recipetineats.com/sweet-potato-steaks/)                                                    |
| 고구마     | 고구마 오븐스택      | [RecipeTin Eats · Nagi Maehashi](https://www.recipetineats.com/roasted-sweet-potato-stacks/)                                            |
| 대파       | 파무침               | [Hyosun](https://www.koreanbapsang.com/pa-muchim-scallion-salad/)                                                                       |
| 대파       | 해물파전             | [Hyosun](https://www.koreanbapsang.com/haemul-pajeon/)                                                                                  |
| 대파       | 대파 중국식 전       | [Maggie Zhu](https://omnivorescookbook.com/chinese-scallion-pancakes/)                                                                  |
| 대파       | 파기름 국수          | [Maggie Zhu](https://omnivorescookbook.com/scallion-oil-noodle/)                                                                        |
| 배추       | 배추 겉절이          | [Hyosun](https://www.koreanbapsang.com/baechu-geotjeori-fresh-kimchi/)                                                                  |
| 배추       | 배추 된장국          | [Hyosun](https://www.koreanbapsang.com/baechu-doenjang-guk/)                                                                            |
| 배추       | 배추전               | [Sue Pressey](https://mykoreankitchen.com/baechujeon/)                                                                                  |
| 배추       | 밀푀유나베           | [Just One Cookbook · Namiko Hirasawa Chen](https://www.justonecookbook.com/mille-feuille-nabe/)                                         |
| 단호박     | 단호박 샐러드        | [Just One Cookbook · Namiko Hirasawa Chen](https://www.justonecookbook.com/kabocha-salad/)                                              |
| 단호박     | 단호박죽             | [Hyosun](https://www.koreanbapsang.com/hobakjuk-kabocha-porridge-and-winners/)                                                          |
| 단호박     | 구운 단호박          | [Just One Cookbook · Namiko Hirasawa Chen](https://www.justonecookbook.com/japanese-roasted-kabocha-squash/)                            |
| 단호박     | 단호박 수프          | [Just One Cookbook · Namiko Hirasawa Chen](https://www.justonecookbook.com/kabocha-squash-soup/)                                        |
| 고추       | 고추 된장무침        | [Hyosun](https://www.koreanbapsang.com/gochu-doenjang-muchim/)                                                                          |
| 고추       | 고추 간장절임        | [Sue Pressey](https://mykoreankitchen.com/korean-style-green-chilli-pickles/)                                                           |
| 고추       | 고추전               | [Sue Pressey](https://mykoreankitchen.com/korean-stuffed-chili-peppers/)                                                                |
| 고추       | 중국식 고추구이      | [Maggie Zhu](https://omnivorescookbook.com/szechuan-pan-fried-peppers/)                                                                 |
| 사과       | 사과 크럼블          | [Nagi                                                                                                                                   | RecipeTin Eats](https://www.recipetineats.com/apple-crumble/)                                   |
| 사과       | 사과 소스            | [RecipeTin Eats · Nagi Maehashi](https://www.recipetineats.com/apple-sauce/)                                                            |
| 사과       | 오븐 사과구이        | [RecipeTin Eats · Nagi Maehashi](https://www.recipetineats.com/baked-apples/)                                                           |
| 사과       | 사과 호두샐러드      | [RecipeTin Eats · Nagi Maehashi](https://www.recipetineats.com/apple-salad-candied-walnuts-cranberries/)                                |
| 귤         | 귤 아몬드케이크      | [The View from Great Island · Sue Moran](https://theviewfromgreatisland.com/minimal-monday-flourless-whole-tangerine-cake-gluten-free/) |
| 귤         | 귤 소르베            | [The View from Great Island · Sue Moran](https://theviewfromgreatisland.com/day-5-of-all-citrus-week-tangerine-sorbet/)                 |
| 귤         | 귤 요거트스무디      | [Cookie and Kate](https://cookieandkate.com/clementine-sunshine-smoothie/)                                                              |
| 귤         | 귤 퀴노아샐러드      | [It’s Not Complicated Recipes · Alexandra Cook](https://itsnotcomplicatedrecipes.com/quinoa-mandarin-and-spinach-salad/)                |

최종 확인(2026-10-13): 테스트 59개·lint·typecheck·수정 파일 Prettier 검사·build 통과. Supabase 연결 로컬 목록에서 84개와 새 8종 필터 각각 4개를 확인했습니다. 귤 목록의 사진 12장과 새송이 파스타 상세의 고정 사진 3장(JPG/WebP) 로딩·실제 새송이 판매 상품 연결을 확인했습니다.
