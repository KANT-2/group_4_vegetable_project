"""회원 응용 계층이 저장소에 요구하는 인터페이스."""

from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.domain.accounts.models import Account, AdminRegistration, Profile


class AccountRepository(Protocol):
    async def get_by_email(self, email: str) -> Account | None: ...

    async def get_by_login(self, identifier: str) -> Account | None: ...

    async def get_by_id(self, user_id: UUID) -> Account | None: ...

    async def get_admin_registration_by_username(
        self, username: str
    ) -> AdminRegistration | None: ...

    async def get_profile(self, user_id: UUID) -> Profile | None: ...

    async def save_profile(self, profile: Profile) -> None: ...

    async def add_user(
        self, account: Account, profile: Profile, username: str
    ) -> None: ...

    async def add_oauth_user(self, account: Account, profile: Profile) -> None: ...

    async def add_admin_registration(
        self, account: Account, registration: AdminRegistration
    ) -> None: ...

    async def revoke_token(
        self, jti: str, user_id: UUID, expires_at: datetime
    ) -> None: ...

    async def is_token_revoked(self, jti: str) -> bool: ...


class AccountUnitOfWork(Protocol):
    repo: AccountRepository

    async def commit(self) -> None: ...

    async def rollback(self) -> None: ...
