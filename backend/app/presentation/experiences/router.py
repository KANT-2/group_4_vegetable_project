"""체험 예약 API. prefix 는 main.py 에서 /api/v1/experiences 로 붙인다."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.application.experiences.service import ExperienceService
from app.domain.experiences.models import ReservationStatus
from app.presentation.experiences.dependencies import CurrentUser, get_current_user, get_service, require_admin
from app.presentation.experiences.schemas import (
    ExperienceDetailOut,
    ExperienceList,
    ExperienceOut,
    ReservationCreate,
    ReservationList,
    ReservationOut,
    SessionOut,
)

router = APIRouter(prefix="/experiences", tags=["experiences"])

Service = Annotated[ExperienceService, Depends(get_service)]
Page = Annotated[int, Query(ge=1)]
Size = Annotated[int, Query(ge=1, le=100)]


def _session_out(s) -> SessionOut:
    return SessionOut(
        id=s.id, experience_id=s.experience_id, starts_at=s.starts_at,
        capacity=s.capacity, remaining=s.remaining, status=s.status,
    )


@router.get("", response_model=ExperienceList, summary="체험 목록 (검색·지역 필터·페이지네이션)")
async def list_experiences(
    service: Service, q: str | None = None, region: str | None = None, page: Page = 1, size: Size = 20
):
    items, total = await service.list_experiences(q, region, page, size)
    return ExperienceList(items=[ExperienceOut.model_validate(i) for i in items], total=total, page=page, size=size)


# 고정 경로(/reservations/..., /admin/...)는 /{experience_id} 보다 먼저 선언한다.
@router.get("/reservations/me", response_model=list[ReservationOut], summary="내 예약 목록")
async def my_reservations(service: Service, user: Annotated[CurrentUser, Depends(get_current_user)]):
    return await service.list_my_reservations(user.id)


@router.post("/reservations/{reservation_id}/cancel", response_model=ReservationOut, summary="예약 취소 (본인만)")
async def cancel_reservation(
    reservation_id: UUID, service: Service, user: Annotated[CurrentUser, Depends(get_current_user)]
):
    return await service.cancel(reservation_id, user.id)


@router.get("/admin/reservations", response_model=ReservationList, summary="[관리자] 예약 목록")
async def admin_reservations(
    service: Service,
    _: Annotated[CurrentUser, Depends(require_admin)],
    session_id: UUID | None = None,
    reservation_status: Annotated[ReservationStatus | None, Query(alias="status")] = None,
    page: Page = 1,
    size: Size = 20,
):
    items, total = await service.list_reservations(session_id, reservation_status, page, size)
    return ReservationList(items=[ReservationOut.model_validate(i) for i in items], total=total, page=page, size=size)


@router.post("/admin/sessions/{session_id}/close", response_model=SessionOut, summary="[관리자] 회차 접수 마감")
async def close_session(session_id: UUID, service: Service, _: Annotated[CurrentUser, Depends(require_admin)]):
    return _session_out(await service.close_session(session_id))


@router.get("/{experience_id}", response_model=ExperienceDetailOut, summary="체험 상세와 회차(잔여 인원)")
async def get_experience(experience_id: str, service: Service):
    experience, sessions = await service.get_experience(experience_id)
    return ExperienceDetailOut(
        **ExperienceOut.model_validate(experience).model_dump(), sessions=[_session_out(s) for s in sessions]
    )


@router.post(
    "/{experience_id}/sessions/{session_id}/reservations",
    response_model=ReservationOut,
    status_code=status.HTTP_201_CREATED,
    summary="예약",
)
async def reserve(
    experience_id: str,
    session_id: UUID,
    body: ReservationCreate,
    service: Service,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    return await service.reserve(session_id, user.id, body.headcount, experience_id=experience_id)
