# 체험 예약 설계 (형준 담당) — 초안

작성: 2026-10-23. **설계 단계이며 구현·DB 적용 전**입니다. 아래 SQL은 초안이고 새 DB에 적용하지 않았습니다. 사용자 식별(`app_users` 여부)이 확정되기 전이라 `user_id` 외래키는 비워 두었습니다(`docs/api-contract-20261023.md` §0).

## 범위

- 포함: 체험 목록·상세, 회차 조회, 예약, 내 예약, 예약 취소, 관리자 예약 목록·접수 마감.
- 제외: 실제 참가비 결제, 사진 업로드, 체험 등록 화면. 체험·회차는 시드로 넣습니다.
- E2E 한 줄기: 체험 목록 화면 → 상세·회차 선택 → 예약 → `내 예약` 화면 → 취소, 관리자는 예약 목록 확인과 접수 마감.

## 테이블 초안

```sql
create table public.experiences (
  id text primary key,
  title text not null,
  description text not null default '',
  farm_name text not null,
  region text not null,
  fee integer not null default 0 check (fee >= 0),          -- 표시용 참가비(결제 없음)
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.experience_sessions (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null references public.experiences(id) on delete cascade,
  starts_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'open' check (status in ('open', 'closed')),  -- closed = 관리자 접수 마감
  unique (experience_id, starts_at)
);

create table public.experience_reservations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.experience_sessions(id),
  user_id uuid not null,                                     -- FK는 사용자 식별 확정 후 추가
  headcount integer not null check (headcount between 1 and 10),
  status text not null default 'reserved' check (status in ('reserved', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
-- 같은 사용자의 같은 회차 중복 예약 방지(취소 건 제외)
create unique index experience_reservations_one_active
  on public.experience_reservations (session_id, user_id) where status = 'reserved';
```

## 업무 규칙 (domain 계층, 순수 파이썬)

| 규칙 | 처리 |
| --- | --- |
| 정원 | 예약 시 회차 행을 `SELECT … FOR UPDATE`로 잠그고 `예약 인원 합계 + 요청 인원 ≤ capacity` 검사. 초과 시 409 |
| 기간 | 시작 시각이 지난 회차는 예약 불가, 취소도 시작 24시간 전까지만 (시간은 상수로 두고 팀과 확인) |
| 접수 마감 | `status='closed'` 회차는 예약 불가(409). 관리자만 마감 가능 |
| 중복 | 같은 사용자·회차의 활성 예약이 있으면 409 (DB 부분 유니크 인덱스가 최종 방어) |
| 취소 | 본인 예약만 취소(타인 예약은 403 또는 404), 이미 취소된 건 재취소 409. 취소하면 정원이 다시 비워짐 |
| 소유권 | `내 예약`은 토큰 사용자 기준으로만 조회. 사용자 ID를 요청 본문으로 받지 않음 |
| 관리자 | 예약 목록 조회·접수 마감은 `role=admin`만(그 외 403) |

예약 생성은 응용 서비스에서 한 트랜잭션: 회차 잠금 → 규칙 검사 → 예약 저장 → 커밋. 실패 시 롤백.

## API 초안 (`/api/v1/experiences`)

| 메서드·경로 | 설명 | 권한 |
| --- | --- | --- |
| `GET /` | 체험 목록. `q`(검색), `region`(필터), `page`, `size` | 공개 |
| `GET /{experience_id}` | 상세 + 회차 목록(잔여 인원 포함) | 공개 |
| `POST /{experience_id}/sessions/{session_id}/reservations` | 예약 `{headcount}` | 로그인 |
| `GET /reservations/me` | 내 예약 목록 | 로그인 |
| `POST /reservations/{reservation_id}/cancel` | 예약 취소 | 본인 |
| `GET /admin/reservations` | 전체 예약 목록(필터: 회차, 상태, 페이지) | admin |
| `POST /admin/sessions/{session_id}/close` | 접수 마감 | admin |

## 4계층 배치

- `domain/experiences/`: `Experience`, `ExperienceSession`, `Reservation`, 규칙 예외(정원 초과·마감·중복·취소 불가). 프레임워크·ORM import 없음.
- `application/experiences/`: 예약·취소·조회·마감 서비스(트랜잭션 경계), Repository 인터페이스.
- `infrastructure/experiences/`: SQLAlchemy 모델, Repository 구현, ORM↔도메인 변환.
- `presentation/experiences/`: 라우터, Pydantic 요청·응답 스키마, 예외→HTTP 변환.

## 검증 계획 (실행 전)

정상 예약·내 예약 조회·취소 / 정원 초과·중복·마감·시작 후 예약 실패 / 타인 예약 취소 거부 / 비관리자의 관리자 API 거부 / 로그아웃 토큰 재사용 401(지나 인증 연동 후). 인증이 완성되기 전에 임시 사용자로 확인한 결과는 인증 연동 완료와 구분해 기록합니다.

## 열린 질문

- 취소 가능 시점(시작 24시간 전)과 1회 최대 인원(10명)을 팀·수업 기준과 맞출지
- 사용자 식별 확정 후 `experience_reservations.user_id` 외래키 대상
- 프론트 화면 신규 구성 범위(목록·상세·예약·내 예약)와 `/experiences` 라우트 추가는 헤더 메뉴(공통 파일, 형준 통합)와 함께 진행
