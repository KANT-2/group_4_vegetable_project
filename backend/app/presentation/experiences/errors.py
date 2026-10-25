"""도메인·응용 예외를 HTTP 응답으로 변환한다. 본문은 {"detail": "메시지"} 형식."""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.application.experiences.service import NotFound
from app.domain.experiences.models import (
    AlreadyCancelled,
    CancellationNotAllowed,
    CapacityExceeded,
    DuplicateReservation,
    ExperienceDomainError,
    InvalidHeadcount,
    NotReservationOwner,
    SessionAlreadyStarted,
    SessionClosed,
)

STATUS_BY_ERROR: dict[type[Exception], int] = {
    NotFound: status.HTTP_404_NOT_FOUND,
    NotReservationOwner: status.HTTP_403_FORBIDDEN,
    InvalidHeadcount: 422,
    SessionClosed: status.HTTP_409_CONFLICT,
    SessionAlreadyStarted: status.HTTP_409_CONFLICT,
    DuplicateReservation: status.HTTP_409_CONFLICT,
    CapacityExceeded: status.HTTP_409_CONFLICT,
    AlreadyCancelled: status.HTTP_409_CONFLICT,
    CancellationNotAllowed: status.HTTP_409_CONFLICT,
}


def register_experience_error_handlers(app: FastAPI) -> None:
    async def handle(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=STATUS_BY_ERROR[type(exc)])

    for error_type in STATUS_BY_ERROR:
        app.add_exception_handler(error_type, handle)
    # 새 규칙 예외가 추가돼도 500 으로 새지 않게 마지막 방어선: 업무 규칙 위반은 409
    app.add_exception_handler(
        ExperienceDomainError,
        lambda _, exc: JSONResponse({"detail": str(exc)}, status_code=status.HTTP_409_CONFLICT),
    )
