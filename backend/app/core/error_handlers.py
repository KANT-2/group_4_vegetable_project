"""모든 API 에 공통인 오류 응답 처리. 형준(공통 통합) 담당.

- 입력 검증 오류(422): 응답에 사용자가 보낸 값(input)을 되돌려 주지 않는다. 비밀번호 같은 값이 응답·로그에 남지 않게 하고,
  무한대(1e999) 같은 값을 JSON 으로 만들다 500 이 나는 문제를 막는다.
- DB 데이터 오류(DataError): 널 문자나 숫자 범위를 벗어난 값처럼 DB 가 거부하는 입력은 500 이 아니라 422 로 알린다.
  각 기능이 입력 검증을 놓쳤더라도 공통으로 막는 안전망이다.
- 처리되지 않은 오류(500): 스택 트레이스·SQL·내부 정보를 응답에 싣지 않고 {"detail": "..."} JSON 으로 통일한다.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, TimeoutError as DatabaseTimeout

logger = logging.getLogger("app.error")


def register_common_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DatabaseTimeout)
    async def database_timeout(_: Request, exc: DatabaseTimeout) -> JSONResponse:
        return JSONResponse({"detail": "데이터베이스 연결이 지연되고 있어요. 잠시 뒤 다시 시도해 주세요."}, status_code=503)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        return JSONResponse({"detail": errors}, status_code=422)

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        # 요청 본문·헤더·쿼리스트링은 기록하지 않고 종류와 경로만 남긴다. (트레이스는 서버 로그가 따로 남긴다)
        logger.error("처리되지 않은 오류: %s %s (%s)", request.method, request.url.path, type(exc).__name__)
        return JSONResponse({"detail": "서버에서 오류가 발생했어요. 잠시 뒤 다시 시도해 주세요."}, status_code=500)

    @app.exception_handler(DBAPIError)
    async def db_error(request: Request, exc: DBAPIError) -> JSONResponse:
        # PostgreSQL 오류 코드(SQLSTATE)가 22 로 시작하면 '데이터 예외'(널 문자, 숫자 범위 초과 등)라서 사용자 입력 문제다.
        cause = getattr(exc.orig, "__cause__", None)
        sqlstate = getattr(cause, "sqlstate", None) or getattr(exc.orig, "sqlstate", None)
        if isinstance(sqlstate, str) and sqlstate.startswith("22"):
            logger.warning("DB 가 거부한 입력: %s %s (%s)", request.method, request.url.path, sqlstate)
            return JSONResponse({"detail": "입력값에 허용되지 않는 문자가 있거나 범위를 벗어났어요."}, status_code=422)
        if sqlstate == "23514":
            return JSONResponse({"detail": "입력값이 저장 조건에 맞지 않아요."}, status_code=422)
        if sqlstate in ("23503", "23505"):
            return JSONResponse({"detail": "이미 등록되었거나 다른 데이터와 연결된 항목입니다. 최신 상태를 확인해 주세요."}, status_code=409)
        if exc.connection_invalidated or (isinstance(sqlstate, str) and sqlstate[:2] in ("08", "53", "57")):
            return JSONResponse({"detail": "데이터베이스에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요."}, status_code=503)
        return await unhandled_error(request, exc)
