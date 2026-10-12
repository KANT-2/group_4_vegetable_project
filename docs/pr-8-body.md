## 변경 내용

C의 Next.js·TypeScript·Tailwind 및 Supabase 공통 기반을 구성했습니다. Server Actions/Route Handlers를 사용하며 FastAPI는 사용하지 않습니다.

Supabase 연결·환경변수·SSR 세션·로그인/로그아웃·프로필 서버 처리·DB 타입·Storage 정책을 준비했습니다. 공유 DB에 테이블 9개·RLS, B의 채소 12개·상품 16개 seed와 이미지 bucket을 적용했습니다. 실제 키와 .env.local은 Git에서 제외하고 DB 적용 순서를 문서화했습니다.

## 리뷰 반영

- .gitattributes에 `* text=auto eol=lf` 추가. Windows core.autocrlf=true 새 clone에서 LF 체크아웃 및 format:check 통과 확인.
- 팀 합의 완료: C 이상재가 공통 테이블·migration·RLS를 관리하고 A·B는 담당 데이터·조회 함수·화면을 구현합니다.
- seed는 B의 feat/useob 데이터 기준이며 main Mock 6개와 다릅니다. B의 데이터 PR 병합 후 일치합니다. SQL 주석에 출처를 명시했습니다.
- ERD에 실제 적용 상태·제약·선택적 프로필 관계를 반영했습니다. 주문상품 1개 이상은 후속 주문 생성 함수에서 보장할 요구사항입니다.

## 검증

- 새 검증 폴더에서 npm ci·build·start, Tailwind CSS 생성 및 health HTTP 200 확인.
- npm test 13개, lint, typecheck, format:check 통과.
- 이번 LF·문서 수정은 현재 저장소 및 core.autocrlf=true 새 clone에서 format:check, git diff --check 통과.
- 실제 Supabase 테이블·RLS·공개 조회·비로그인 개인 테이블 접근 거부·Storage 설정 확인.

제품 layout/page가 없어 설치·빌드·실행 검증에는 임시 폴더에만 최소 화면을 추가했습니다. 실제 제품 화면·로그인 연동·이미지 업로드·주문 처리·배포는 후속 일감입니다. getImageUrl의 경로 예외 동작은 유지하며 화면 연결 시 대체 이미지·오류 처리를 적용합니다.

[Notion 작업 기록](https://app.notion.com/p/3f3db49922e5811bb7edcf3ff88fe0b0)
[Redmine #10](https://redmine-302549221655.asia-northeast3.run.app/issues/10)
