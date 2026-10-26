from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.application.accounts.service import InvalidCredentials, LoginResult
from app.application.accounts.read_models import MyAccount
from app.domain.accounts.models import (
    AccessTokenPayload,
    Account,
    AdminRegistration,
    AuthenticatedUser,
    Profile,
    ShippingAddress,
    UserRole,
)
from app.presentation.accounts.dependencies import (
    AuthContext,
    get_account_service,
    get_auth_context,
    get_current_user,
    get_profile_service,
    require_admin,
)
from app.presentation.accounts.router import router


class FakeAccountService:
    def __init__(self, reject_login: bool = False):
        self.reject_login = reject_login
        self.login_args = None
        self.logged_out = None
        self.registration_args = None
        self.user_registration_args = None

    async def login(self, email, password):
        self.login_args = (email, password)
        if self.reject_login:
            raise InvalidCredentials("이메일 또는 비밀번호가 올바르지 않습니다.")
        account = Account(uuid4(), email, "encoded", UserRole.USER, True)
        return LoginResult("access-token", "bearer", 3600, account)

    async def logout(self, payload):
        self.logged_out = payload

    async def register_admin(self, email, password, username, display_name):
        self.registration_args = (email, password, username, display_name)
        return AdminRegistration(uuid4(), username, display_name)

    async def register_user(self, email, password, username, nickname):
        self.user_registration_args = (email, password, username, nickname)
        return Account(uuid4(), email, "encoded", UserRole.USER, True)


class FakeProfileService:
    def __init__(self, user_id):
        self.account = Account(
            user_id, "jina@test.com", "encoded", UserRole.USER, True
        )
        self.profile = Profile(user_id, "지나")

    async def get_me(self, user_id):
        assert user_id == self.account.id
        return MyAccount(self.account, self.profile)

    async def update_nickname(self, user_id, nickname):
        assert user_id == self.account.id
        self.profile = Profile(user_id, nickname, self.profile.shipping_address)
        return self.profile

    async def update_shipping_address(self, user_id, address):
        assert user_id == self.account.id
        self.profile = Profile(user_id, self.profile.nickname, address)
        return self.profile

    async def clear_shipping_address(self, user_id):
        assert user_id == self.account.id
        self.profile = Profile(user_id, self.profile.nickname, None)
        return self.profile


def make_auth_context() -> AuthContext:
    user_id = uuid4()
    payload = AccessTokenPayload(
        user_id=user_id,
        role=UserRole.USER,
        jti="token-jti",
        expires_at=datetime.now(UTC) + timedelta(hours=1),
    )
    return AuthContext(AuthenticatedUser(user_id, UserRole.USER), payload)


async def request_with(service, auth_context=None):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_account_service] = lambda: service
    if auth_context is not None:
        app.dependency_overrides[get_auth_context] = lambda: auth_context
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def profile_client(profile_service, user):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_profile_service] = lambda: profile_service
    app.dependency_overrides[get_current_user] = lambda: user
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def test_login_uses_oauth2_form_and_returns_token():
    service = FakeAccountService()
    async with await request_with(service) as client:
        response = await client.post(
            "/api/v1/accounts/login",
            data={"username": "jina@test.com", "password": "test1234!"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "access-token",
        "token_type": "bearer",
        "expires_in": 3600,
    }
    assert service.login_args == ("jina@test.com", "test1234!")


async def test_admin_registration_returns_pending_without_exposing_password():
    service = FakeAccountService()
    async with await request_with(service) as client:
        response = await client.post(
            "/api/v1/accounts/admin-registrations",
            json={
                "username": "newadmin",
                "password": "SecurePass123!",
                "display_name": "관리자 신청자",
                "email": "admin@example.test",
            },
        )

    assert response.status_code == 201
    assert response.json() == {"status": "pending"}
    assert service.registration_args == (
        "admin@example.test",
        "SecurePass123!",
        "newadmin",
        "관리자 신청자",
    )


async def test_user_registration_creates_normal_account():
    service = FakeAccountService()
    async with await request_with(service) as client:
        response = await client.post(
            "/api/v1/accounts/register",
            json={
                "username": "new_user",
                "email": "new@example.test",
                "nickname": "새싹회원",
                "password": "test1234!",
            },
        )

    assert response.status_code == 201
    assert response.json()["username"] == "new_user"
    assert response.json()["email"] == "new@example.test"
    assert service.user_registration_args == (
        "new@example.test",
        "test1234!",
        "new_user",
        "새싹회원",
    )


async def test_login_failure_returns_401_without_account_disclosure():
    service = FakeAccountService(reject_login=True)
    async with await request_with(service) as client:
        response = await client.post(
            "/api/v1/accounts/login",
            data={"username": "none@test.com", "password": "wrong"},
        )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "이메일 또는 비밀번호가 올바르지 않습니다."
    }


async def test_logout_passes_verified_token_payload_to_service():
    service = FakeAccountService()
    context = make_auth_context()
    async with await request_with(service, context) as client:
        response = await client.post("/api/v1/accounts/logout")

    assert response.status_code == 204
    assert response.content == b""
    assert service.logged_out == context.payload


async def test_require_admin_rejects_normal_user():
    with pytest.raises(HTTPException) as exc:
        await require_admin(AuthenticatedUser(uuid4(), UserRole.USER))

    assert exc.value.status_code == 403


async def test_require_admin_accepts_admin():
    admin = AuthenticatedUser(uuid4(), UserRole.ADMIN)
    assert await require_admin(admin) == admin


async def test_me_returns_authenticated_users_profile():
    user = AuthenticatedUser(uuid4(), UserRole.USER)
    service = FakeProfileService(user.id)
    async with await profile_client(service, user) as client:
        response = await client.get("/api/v1/accounts/me")

    assert response.status_code == 200
    assert response.json()["id"] == str(user.id)
    assert response.json()["profile"]["nickname"] == "지나"


async def test_profile_update_does_not_accept_user_id_from_client():
    user = AuthenticatedUser(uuid4(), UserRole.USER)
    service = FakeProfileService(user.id)
    async with await profile_client(service, user) as client:
        response = await client.patch(
            "/api/v1/accounts/me/profile",
            json={"nickname": "새닉네임", "user_id": str(uuid4())},
        )

    assert response.status_code == 422


async def test_address_update_normalizes_phone_and_persists_for_me():
    user = AuthenticatedUser(uuid4(), UserRole.USER)
    service = FakeProfileService(user.id)
    body = {
        "recipient_name": "김지나",
        "recipient_phone": "010-1234-5678",
        "postal_code": "12345",
        "address": "서울시 중구 세종대로 1",
        "address_detail": "101호",
    }
    async with await profile_client(service, user) as client:
        saved = await client.put("/api/v1/accounts/me/address", json=body)
        loaded = await client.get("/api/v1/accounts/me/address")

    assert saved.status_code == 200
    assert saved.json()["recipient_phone"] == "01012345678"
    assert loaded.json() == saved.json()


async def test_address_update_rejects_missing_required_value():
    user = AuthenticatedUser(uuid4(), UserRole.USER)
    service = FakeProfileService(user.id)
    async with await profile_client(service, user) as client:
        response = await client.put(
            "/api/v1/accounts/me/address",
            json={"recipient_name": "김지나", "postal_code": "12345"},
        )

    assert response.status_code == 422


async def test_address_delete_clears_only_authenticated_users_address():
    user = AuthenticatedUser(uuid4(), UserRole.USER)
    service = FakeProfileService(user.id)
    service.profile = Profile(
        user.id,
        "지나",
        ShippingAddress(
            "김지나", "01012345678", "12345", "서울시 중구 세종대로 1", "101호"
        ),
    )
    async with await profile_client(service, user) as client:
        response = await client.delete("/api/v1/accounts/me/address")

    assert response.status_code == 204
    assert service.profile.shipping_address is None


async def test_openapi_describes_account_flows_for_swagger_users():
    user = AuthenticatedUser(uuid4(), UserRole.USER)
    service = FakeProfileService(user.id)
    async with await profile_client(service, user) as client:
        response = await client.get("/openapi.json")

    operations = response.json()["paths"]
    assert operations["/api/v1/accounts/login"]["post"]["summary"] == "이메일 로그인"
    assert operations["/api/v1/accounts/logout"]["post"]["summary"] == "로그아웃"
    assert (
        operations["/api/v1/accounts/me/address"]["put"]["summary"]
        == "내 기본 배송지 저장"
    )
