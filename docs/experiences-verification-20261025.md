# 체험 예약 담당 Use Case — 구현·검증 기록 (형준)

작성: 2026-10-25. README·Notion·발표자료에 옮겨 쓸 초안입니다. **실제로 실행해 확인한 것과 아직 못 한 것을 구분해서** 적었습니다. 화면 연동과 실제 인증(JWT 블랙리스트) 연동 결과는 이 문서에 없습니다(미완료).

## 1. 담당 Use Case

체험 목록·상세 조회 → 회차 선택 → 예약 → 내 예약 확인 → 취소, 관리자의 회차별 예약 조회·접수 마감.
체험·회차는 시드로 준비했고, 실제 참가비 결제·사진 업로드·체험 등록은 범위에서 제외했습니다.

## 2. 구조와 요청 흐름

`presentation(router·schemas·errors)` → `application(service·ports·read_models)` → `domain(models)` ← `infrastructure(models·repositories)`

- 도메인(`domain/experiences/models.py`): 표준 라이브러리만 사용. FastAPI·SQLAlchemy·Pydantic import 없음(검색으로 확인).
- 응용 서비스: 조회 → 도메인 메서드 → 저장 → commit, 실패 시 rollback. 같은 회차의 동시 예약은 회차 행 `FOR UPDATE` 잠금으로 순서대로 처리.
- Repository: ORM 모델 ↔ 도메인 객체 변환, 화면용 조회는 `ReservationDetail`(응용 계층 조회 모델).
- DB: PostgreSQL(새 Supabase) + SQLAlchemy 비동기 + asyncpg. 같은 사용자·회차의 활성 예약 중복은 부분 유니크 인덱스가 최종 방어.

## 3. 업무 규칙과 응답

| 규칙 | 위반 시 응답 |
| --- | --- |
| 참가 인원 1~10명 | 422 |
| 정원 초과 | 409 |
| 접수 마감 회차 | 409 |
| 시작했거나 지난 회차 | 409 |
| 같은 회차 활성 예약 중복 (취소 후에는 재예약 가능) | 409 |
| 본인 예약만 취소 | 403 |
| 이미 취소된 예약 재취소 / 시작 24시간 이내 취소 | 409 |
| 없는 체험·회차·예약, 체험과 회차가 맞지 않음 | 404 |
| 관리자 API(예약 목록·접수 마감)에 일반 사용자 | 403 |
| 토큰 없음·위조·만료 | 401 |

취소 기한 24시간과 최대 인원 10명은 팀 합의 전의 가정값입니다.

## 4. 실제 실행한 검증 (2026-10-25, `cd backend && uv run pytest -q`: 33건 통과)

| 구분 | 건수 | 내용 |
| --- | --- | --- |
| 도메인 단위 | 13 | 위 규칙을 DB 없이 검증 |
| 서비스 통합(실제 새 DB) | 7 | 예약→내 예약→취소 후 정원 복구, 정원 초과 시 아무것도 저장되지 않음, 중복(취소 후 재예약 허용), 타인 취소 거부와 데이터 유지, 마감, 없는 대상, **동시 5건이 마지막 1석 예약 시 1건만 성공** |
| API(실제 새 DB에 HTTP) | 8 | 목록 검색·페이지네이션, 상세와 잔여 인원, 비로그인·위조·만료 401, 예약·내 예약·취소 흐름과 응답의 체험 이름·시작 시간, 규칙 위반 상태 코드, 타인 취소 403, 관리자 권한 403, 마감 후 신규 예약 차단 |
| 기반 | 5 | health, DB 미설정 응답, CORS, 설정 검증 |

- 테스트가 만든 데이터는 종료 시 삭제하며, 실행 후 DB에 `test-` 데이터가 남지 않음을 조회로 확인했습니다.
- Swagger(`/docs`)에 체험 API 7개가 노출되는 것을 OpenAPI 생성으로 확인했습니다.

## 5. 아직 못 한 것 (미완료)

- 프론트 화면(목록·상세·예약 폼·내 예약·취소·관리자) 연결과 화면 기준 E2E 확인
- 인증: 현재는 합의 중인 토큰 규격(`sub`=사용자 UUID, `role`)만 검증하는 **임시 어댑터**이며, 로그아웃한 토큰의 재사용 401 차단은 검증하지 못했습니다. 지나의 공통 인증이 들어온 뒤 `presentation/experiences/dependencies.py`의 두 함수를 교체하고 다시 검증해야 합니다.
- `experience_reservations.user_id` 외래키(사용자 식별 확정 후)

## 6. 재현 방법

```bash
cd backend
uv sync
# backend/.env 에 DATABASE_URL·JWT_SECRET_KEY 입력 후
PYTHONPATH=. uv run python scripts/apply_sql.py file supabase/migrations/202610250001_experiences.sql
PYTHONPATH=. uv run python scripts/apply_sql.py file supabase/seeds/experiences.sql   # 재실행해도 중복 없음
uv run pytest -q
uv run uvicorn app.main:app --reload --port 8000   # http://localhost:8000/docs
```
