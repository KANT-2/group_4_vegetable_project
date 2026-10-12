# A 로컬 작업 위치 정리 — 2026-10-12

## 앞으로 사용하는 폴더

- 작업 폴더: `C:/dev/group_6_vegetable_project`
- 작업 브랜치: `feat/a-work`
- 최신 원격 main(Google 로그인 코드 포함)에 A/B 통합 변경을 병합했다.
- 기존 `C:/dev/wt_recipes_app`은 보존용이며 새 작업은 원래 폴더에서 진행한다. 기존 폴더를 삭제하지 않았다.

## 원래 미커밋 작업 보존

- Git stash: `preserve original A local work before consolidation 2026-10-12`
- 백업 커밋: `6f99087711ac11d83f21a331283db3d8b2774799`
- 백업 태그: `backup/a-local-before-20261012` (로컬 전용, 원격에 올리지 않음)
- 원래 `feat/recipes` 브랜치와 미추적 파일도 stash에 보존했다.
- 이전 레시피 migration/seed가 포함된 오래된 작업은 최신 공통 DB 위에 무조건 덮어씌우거나 재적용하지 않는다.

## 실행 및 검증

```text
cd C:\dev\group_6_vegetable_project
npm ci
npm run dev
```

이 폴더에서 테스트 19개, lint, typecheck, build가 통과했다. 실제 Google 인증, 팀 Supabase 적용, 실제 휴대폰 및 배포 검수는 아직 확인하지 않았다.

`.env.local`이 없으면 상품/레시피 화면은 시연 데이터로 실행된다. Google 로그인에는 팀 Supabase URL·공개 키와 `NEXT_PUBLIC_SITE_URL=http://localhost:3000` 설정이 필요하다. Google Client Secret을 PC나 Git에 저장하지 않는다.
