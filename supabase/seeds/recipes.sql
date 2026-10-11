-- 레시피 예시 데이터 (A 담당). src/data/mock/recipes.ts 의 내용과 같아요.
-- 선행: B의 catalog seed(products)가 먼저 적용되어 있어야 해요. 여러 번 실행해도 중복되지 않아요.
-- 요리 사진이 없어서 image_path 는 비워 두었어요. 사진을 Storage(recipes/)에 올린 뒤 채워 주세요.

insert into public.recipes (id, name, description, cook_time_min, difficulty, servings, ingredients, steps)
values (
  'carrot-rapee',
  '당근 라페',
  '새콤달콤하게 절인 채 썬 당근 샐러드. 샌드위치나 고기 요리에 곁들이기 좋아요.',
  15,
  'easy',
  2,
  '[{"name":"당근","amount":"2개 (약 300g)"},{"name":"소금","amount":"1/2작은술"},{"name":"올리브유","amount":"2큰술"},{"name":"레몬즙","amount":"1큰술"},{"name":"홀그레인 머스터드","amount":"1작은술"},{"name":"설탕 또는 꿀","amount":"1작은술"},{"name":"후추","amount":"약간"}]'::jsonb,
  '["당근을 깨끗이 씻어 필러나 칼로 얇게 채 썬다. 모양이 휜 당근도 채 썰면 티가 나지 않는다.","채 썬 당근에 소금을 뿌려 10분 정도 두었다가, 나온 물기를 손으로 꼭 짠다.","올리브유, 레몬즙, 홀그레인 머스터드, 설탕, 후추를 섞어 드레싱을 만든다.","당근에 드레싱을 넣고 고루 버무린다.","바로 먹어도 좋지만 냉장고에서 30분 이상 두면 맛이 더 잘 어우러진다. (조리 시간에는 숙성 시간이 포함되지 않아요.)"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cook_time_min = excluded.cook_time_min,
  difficulty = excluded.difficulty,
  servings = excluded.servings,
  ingredients = excluded.ingredients,
  steps = excluded.steps;

insert into public.recipes (id, name, description, cook_time_min, difficulty, servings, ingredients, steps)
values (
  'cabbage-tuna-stir-fry',
  '양배추 참치 볶음',
  '꼬마 양배추 한 통을 한 번에 쓰기 좋은 간단 밥반찬이에요.',
  15,
  'easy',
  2,
  '[{"name":"양배추","amount":"1/4통 (약 300g)"},{"name":"참치캔","amount":"1캔 (150g)"},{"name":"양파","amount":"1/2개"},{"name":"다진 마늘","amount":"1작은술"},{"name":"간장","amount":"1큰술"},{"name":"식용유","amount":"1큰술"},{"name":"후추","amount":"약간"}]'::jsonb,
  '["양배추는 한입 크기로 썰고 양파는 채 썬다. 참치는 체에 밭쳐 기름을 뺀다.","달군 팬에 식용유를 두르고 다진 마늘과 양파를 1~2분 볶는다.","양배추를 넣고 숨이 죽을 때까지 센 불에서 3~4분 볶는다.","참치와 간장을 넣고 1~2분 더 볶은 뒤 후추를 뿌려 마무리한다."]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cook_time_min = excluded.cook_time_min,
  difficulty = excluded.difficulty,
  servings = excluded.servings,
  ingredients = excluded.ingredients,
  steps = excluded.steps;

insert into public.recipes (id, name, description, cook_time_min, difficulty, servings, ingredients, steps)
values (
  'apple-cabbage-salad',
  '사과 양배추 샐러드',
  '아삭한 양배추와 새콤달콤한 사과를 요거트 드레싱에 버무린 샐러드예요.',
  10,
  'easy',
  2,
  '[{"name":"사과","amount":"1개"},{"name":"양배추","amount":"200g"},{"name":"플레인 요거트","amount":"3큰술"},{"name":"마요네즈","amount":"1큰술"},{"name":"레몬즙","amount":"1큰술"},{"name":"소금","amount":"한 꼬집"}]'::jsonb,
  '["양배추를 가늘게 채 썰어 찬물에 잠깐 담갔다가 물기를 털어낸다.","사과는 씨를 빼고 얇게 채 썬다. 흠집 난 부분은 도려낸다. 갈변하지 않도록 레몬즙을 조금 뿌려 둔다.","요거트, 마요네즈, 남은 레몬즙, 소금을 섞어 드레싱을 만든다.","양배추와 사과에 드레싱을 넣고 가볍게 버무려 바로 낸다."]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cook_time_min = excluded.cook_time_min,
  difficulty = excluded.difficulty,
  servings = excluded.servings,
  ingredients = excluded.ingredients,
  steps = excluded.steps;

insert into public.recipes (id, name, description, cook_time_min, difficulty, servings, ingredients, steps)
values (
  'shiitake-soy-stir-fry',
  '표고버섯 간장 볶음',
  '표고의 진한 향을 살린 간단한 볶음. 밥반찬과 술안주 모두 잘 어울려요.',
  20,
  'easy',
  2,
  '[{"name":"표고버섯","amount":"300g"},{"name":"양파","amount":"1/2개"},{"name":"대파","amount":"1/2대"},{"name":"간장","amount":"1큰술"},{"name":"다진 마늘","amount":"1/2작은술"},{"name":"식용유","amount":"1큰술"},{"name":"참기름","amount":"1작은술"}]'::jsonb,
  '["표고버섯은 밑동을 떼고 젖은 행주로 겉을 닦은 뒤 먹기 좋게 썬다. 크기가 제각각이면 큰 것만 더 잘게 나눈다.","양파는 채 썰고 대파는 송송 썬다.","달군 팬에 식용유를 두르고 표고버섯을 넣어 물기가 날아가고 노릇해질 때까지 볶는다.","양파와 다진 마늘을 넣고 1~2분 볶다가 간장을 팬 가장자리로 둘러 넣어 섞는다.","대파와 참기름을 넣고 불을 끈 뒤 섞는다."]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cook_time_min = excluded.cook_time_min,
  difficulty = excluded.difficulty,
  servings = excluded.servings,
  ingredients = excluded.ingredients,
  steps = excluded.steps;

insert into public.recipes (id, name, description, cook_time_min, difficulty, servings, ingredients, steps)
values (
  'carrot-soup',
  '당근 수프',
  '당근과 양파를 푹 익혀 갈아 만든 부드럽고 달큰한 수프예요.',
  30,
  'normal',
  2,
  '[{"name":"당근","amount":"2개 (약 300g)"},{"name":"양파","amount":"1/2개"},{"name":"버터","amount":"1큰술"},{"name":"물 또는 채소 육수","amount":"400ml"},{"name":"우유","amount":"100ml"},{"name":"소금","amount":"약간"},{"name":"후추","amount":"약간"}]'::jsonb,
  '["당근은 껍질을 얇게 벗겨 작게 썰고, 양파는 잘게 썬다.","냄비에 버터를 녹이고 양파를 투명해질 때까지 볶는다.","당근을 넣고 2~3분 더 볶은 뒤 물(또는 육수)을 붓고 뚜껑을 덮어 당근이 푹 익을 때까지 15분쯤 끓인다.","한 김 식힌 뒤 믹서에 곱게 간다. 뜨거운 내용물은 믹서 뚜껑을 꼭 잡고 조심해서 간다.","냄비에 다시 붓고 우유를 넣어 약불에서 데운 뒤 소금과 후추로 간을 맞춘다."]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cook_time_min = excluded.cook_time_min,
  difficulty = excluded.difficulty,
  servings = excluded.servings,
  ingredients = excluded.ingredients,
  steps = excluded.steps;

insert into public.recipes (id, name, description, cook_time_min, difficulty, servings, ingredients, steps)
values (
  'paprika-omelette',
  '파프리카 오믈렛',
  '삐뚤빼뚤한 파프리카를 잘게 썰어 넣어 색이 알록달록한 한 끼 오믈렛이에요.',
  15,
  'normal',
  1,
  '[{"name":"파프리카","amount":"1개"},{"name":"달걀","amount":"3개"},{"name":"우유","amount":"2큰술"},{"name":"소금","amount":"한 꼬집"},{"name":"후추","amount":"약간"},{"name":"식용유","amount":"1큰술"}]'::jsonb,
  '["파프리카는 꼭지와 씨를 빼고 잘게 깍둑썬다.","달걀에 우유, 소금, 후추를 넣고 흰자가 풀어질 때까지 섞는다.","중불로 달군 팬에 식용유를 두르고 파프리카를 1~2분 볶아 덜어 둔다.","같은 팬에 달걀물을 붓고 가장자리가 익으면 젓가락으로 가볍게 저어 반숙 상태로 만든다.","한쪽에 파프리카를 올리고 반으로 접어 접시에 담는다."]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cook_time_min = excluded.cook_time_min,
  difficulty = excluded.difficulty,
  servings = excluded.servings,
  ingredients = excluded.ingredients,
  steps = excluded.steps;

insert into public.recipes (id, name, description, cook_time_min, difficulty, servings, ingredients, steps)
values (
  'carrot-cake',
  '당근 케이크',
  '곱게 간 당근이 들어가 촉촉하고 은은하게 달콤한 홈베이킹 케이크예요.',
  60,
  'normal',
  4,
  '[{"name":"당근","amount":"1개 (약 150g)"},{"name":"박력분","amount":"150g"},{"name":"설탕","amount":"80g"},{"name":"달걀","amount":"2개"},{"name":"식용유","amount":"80ml"},{"name":"베이킹파우더","amount":"1작은술"},{"name":"시나몬 가루","amount":"1/2작은술"},{"name":"다진 호두","amount":"30g (선택)"}]'::jsonb,
  '["오븐을 175℃로 예열하고 틀에 유산지를 깐다. 당근은 강판에 곱게 간다.","볼에 달걀과 설탕을 넣고 설탕이 녹을 때까지 섞은 뒤 식용유를 조금씩 넣으며 섞는다.","박력분, 베이킹파우더, 시나몬 가루를 체에 쳐서 넣고 가루가 보이지 않을 때까지 가볍게 섞는다.","간 당근과 호두를 넣고 한두 번 더 섞은 뒤 틀에 붓는다.","예열한 오븐에서 35~40분 굽는다. 꼬치로 찔러 반죽이 묻어 나오지 않으면 다 구워진 것이다.","틀에서 꺼내 식힘망에서 충분히 식힌 뒤 썬다. (오븐마다 차이가 있으니 굽는 시간은 상태를 보며 조절하세요.)"]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  cook_time_min = excluded.cook_time_min,
  difficulty = excluded.difficulty,
  servings = excluded.servings,
  ingredients = excluded.ingredients,
  steps = excluded.steps;

insert into public.recipe_products (recipe_id, product_id) values
  ('carrot-rapee', 'carrot-bent-1kg'),
  ('carrot-rapee', 'carrot-irregular-3kg'),
  ('cabbage-tuna-stir-fry', 'cabbage-small-1ea'),
  ('cabbage-tuna-stir-fry', 'onion-small-2kg'),
  ('apple-cabbage-salad', 'apple-scratched-2kg'),
  ('apple-cabbage-salad', 'cabbage-small-1ea'),
  ('apple-cabbage-salad', 'apple-small-3kg'),
  ('shiitake-soy-stir-fry', 'shiitake-irregular-500g'),
  ('shiitake-soy-stir-fry', 'onion-small-2kg'),
  ('shiitake-soy-stir-fry', 'green-onion-small-1bunch'),
  ('carrot-soup', 'carrot-bent-1kg'),
  ('carrot-soup', 'onion-small-2kg'),
  ('carrot-soup', 'carrot-irregular-3kg'),
  ('paprika-omelette', 'paprika-irregular-4ea'),
  ('carrot-cake', 'carrot-bent-1kg'),
  ('carrot-cake', 'carrot-irregular-3kg')
on conflict do nothing;
