"""로그인·로그아웃 API."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.application.accounts.service import InvalidCredentials
from app.application.accounts.profile_service import AccountNotFound, ProfileNotFound
from app.presentation.accounts.dependencies import (
    AccountServiceDep,
    CurrentAuth,
    CurrentUser,
    ProfileServiceDep,
)
from app.presentation.accounts.schemas import (
    MeOut,
    NicknameUpdate,
    ProfileOut,
    ShippingAddressIn,
    ShippingAddressOut,
    TokenOut,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("/login", response_model=TokenOut)
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


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    auth: CurrentAuth,
    service: AccountServiceDep,
) -> Response:
    await service.logout(auth.payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.get("/me", response_model=MeOut)
async def me(user: CurrentUser, service: ProfileServiceDep) -> MeOut:
    try:
        result = await service.get_me(user.id)
    except (AccountNotFound, ProfileNotFound) as exc:
        raise _not_found(exc) from None
    return MeOut.from_read_model(result)


@router.patch("/me/profile", response_model=ProfileOut)
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


@router.get("/me/address", response_model=ShippingAddressOut)
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


@router.put("/me/address", response_model=ShippingAddressOut)
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


@router.delete("/me/address", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    user: CurrentUser,
    service: ProfileServiceDep,
) -> Response:
    try:
        await service.clear_shipping_address(user.id)
    except ProfileNotFound as exc:
        raise _not_found(exc) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
