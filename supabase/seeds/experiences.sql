-- 체험·회차 개발용 시드 (형준 담당). 여러 번 실행해도 중복되지 않습니다. 참가비는 표시용이며 결제하지 않습니다.
begin;

insert into public.experiences (id, title, description, farm_name, region, fee, image_path) values
  ('kimjang-class', '못난이 배추 김장 체험', '농가에서 직접 배추를 절이고 양념을 버무려 보는 김장 체험입니다.', '햇살배추농장', '강원 평창', 30000, 'products/napa-cabbage-irregular.jpg'),
  ('apple-picking', '못난이 사과 따기 체험', '모양은 제각각이어도 맛은 그대로인 사과를 직접 따 보는 체험입니다.', '바람언덕과수원', '경북 안동', 15000, 'products/apple.jpg'),
  ('carrot-harvest', '당근 수확 체험', '흙 속에서 당근을 뽑아 보고 당근 라페를 함께 만듭니다.', '붉은들농원', '제주 구좌', 20000, 'products/carrot.jpg')
on conflict (id) do nothing;

insert into public.experience_sessions (experience_id, starts_at, capacity, status) values
  ('kimjang-class', '2026-11-14 10:00+09', 12, 'open'),
  ('kimjang-class', '2026-11-21 10:00+09', 12, 'open'),
  ('kimjang-class', '2026-11-28 10:00+09', 8, 'closed'),
  ('apple-picking', '2026-11-15 14:00+09', 6, 'open'),
  ('apple-picking', '2026-11-22 14:00+09', 6, 'open'),
  ('carrot-harvest', '2026-11-16 11:00+09', 10, 'open')
on conflict (experience_id, starts_at) do nothing;

commit;
