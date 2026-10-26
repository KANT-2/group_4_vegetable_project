"""로그인·로그아웃 API."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.application.accounts.service import InvalidCredentials, RegistrationConflict
from app.application.accounts.profile_service import AccountNotFound, ProfileNotFound
from app.presentation.accounts.dependencies import (
    AccountServiceDep,
    CurrentAuth,
    CurrentUser,
    ProfileServiceDep,
)
from app.presentation.accounts.schemas import (
    MeOut,
    AdminRegistrationIn,
    AdminRegistrationOut,
    NicknameUpdate,
    ProfileOut,
    ShippingAddressIn,
    ShippingAddressOut,
    TokenOut,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post(
    "/admin-registrations",
    response_model=AdminRegistrationOut,
    status_code=status.HTTP_201_CREATED,
    summary="관리자 가입 신청",
)
async def register_admin(
    body: AdminRegistrationIn, service: AccountServiceDep
) -> AdminRegistrationOut:
    try:
        registration = await service.register_admin(
            body.email, body.password, body.username, body.display_name
        )
    except RegistrationConflict as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from None
    return AdminRegistrationOut(status=registration.status.value)


@router.post(
    "/login",
    response_model=TokenOut,
    summary="이메일 로그인",
    description="이메일과 비밀번호를 검증하고 보호 API에 사용할 JWT를 발급합니다.",
    responses={401: {"description": "이메일 또는 비밀번호가 올바르지 않음"}},
)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: AccountServiceDep,
) -> TokenOut:
    try:
        result = await service.login(form.username, form.password)
    except InvalidCredentials as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    return TokenOut(
        access_token=result.access_token,
        token_type=result.token_type,
        expires_in=result.expires_in,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="로그아웃",
    description="현재 JWT를 블랙리스트에 등록해 만료 전 재사용도 차단합니다.",
)
async def logout(
    auth: CurrentAuth,
    service: AccountServiceDep,
) -> Response:
    await service.logout(auth.payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.get(
    "/me",
    response_model=MeOut,
    summary="내 계정과 프로필 조회",
    responses={404: {"description": "계정 또는 프로필을 찾을 수 없음"}},
)
async def me(user: CurrentUser, service: ProfileServiceDep) -> MeOut:
    try:
        result = await service.get_me(user.id)
    except (AccountNotFound, ProfileNotFound) as exc:
        raise _not_found(exc) from None
    return MeOut.from_read_model(result)


@router.patch(
    "/me/profile",
    response_model=ProfileOut,
    summary="내 닉네임 수정",
    responses={404: {"description": "프로필을 찾을 수 없음"}},
)
async def update_profile(
    body: NicknameUpdate,
    user: CurrentUser,
    service: ProfileServiceDep,
) -> ProfileOut:
    try:
        profile = await service.update_nickname(user.id, body.nickname)
    except ProfileNotFound as exc:
        raise _not_found(exc) from None
    return ProfileOut.from_domain(profile)


@router.get(
    "/me/address",
    response_model=ShippingAddressOut,
    summary="내 기본 배송지 조회",
    responses={404: {"description": "프로필 또는 등록된 배송지를 찾을 수 없음"}},
)
async def get_address(
    user: CurrentUser,
    service: ProfileServiceDep,
) -> ShippingAddressOut:
    try:
        result = await service.get_me(user.id)
    except (AccountNotFound, ProfileNotFound) as exc:
        raise _not_found(exc) from None
    if result.profile.shipping_address is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "등록된 배송지가 없습니다.")
    return ShippingAddressOut.from_domain(result.profile.shipping_address)


@router.put(
    "/me/address",
    response_model=ShippingAddressOut,
    summary="내 기본 배송지 저장",
    description="기존 기본 배송지가 있으면 전달한 값으로 전체 교체합니다.",
    responses={404: {"description": "프로필을 찾을 수 없음"}},
)
async def update_address(
    body: ShippingAddressIn,
    user: CurrentUser,
    service: ProfileServiceDep,
) -> ShippingAddressOut:
    try:
        profile = await service.update_shipping_address(user.id, body.to_domain())
    except ProfileNotFound as exc:
        raise _not_found(exc) from None
    return ShippingAddressOut.from_domain(profile.shipping_address)


@router.delete(
    "/me/address",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="내 기본 배송지 삭제",
    responses={404: {"description": "프로필을 찾을 수 없음"}},
)
async def delete_address(
    user: CurrentUser,
    service: ProfileServiceDep,
) -> Response:
    try:
        await service.clear_shipping_address(user.id)
    except ProfileNotFound as exc:
        raise _not_found(exc) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
