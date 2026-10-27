"""회원 Repository와 요청 단위 트랜잭션 구현."""

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.accounts.models import (
    Account,
    AdminRegistration,
    AdminRegistrationStatus,
    Profile,
    ShippingAddress,
    UserRole,
)
from app.infrastructure.accounts.models import (
    AdminRegistrationModel,
    AppUserModel,
    ProfileModel,
    RevokedTokenModel,
)


def _to_account(model: AppUserModel) -> Account:
    return Account(
        id=model.id,
        email=model.email,
        password_hash=model.password_hash,
        role=UserRole(model.role),
        is_active=model.is_active,
        username=model.username,
    )


def _to_profile(model: ProfileModel) -> Profile:
    shipping = None
    if model.recipient_name is not None:
        shipping = ShippingAddress(
            recipient_name=model.recipient_name,
            recipient_phone=model.recipient_phone or "",
            postal_code=model.postal_code or "",
            address=model.address or "",
            address_detail=model.address_detail or "",
        )
    return Profile(model.id, model.nickname, shipping)


def _to_admin_registration(model: AdminRegistrationModel) -> AdminRegistration:
    return AdminRegistration(
        account_id=model.account_id,
        username=model.username,
        display_name=model.display_name,
        status=AdminRegistrationStatus(model.status),
        created_at=model.created_at,
    )


class SqlAlchemyAccountRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_email(self, email: str) -> Account | None:
        model = await self._session.scalar(
            select(AppUserModel).where(AppUserModel.email == email)
        )
        return _to_account(model) if model else None

    async def get_by_login(self, identifier: str) -> Account | None:
        normalized = identifier.strip().lower()
        model = await self._session.scalar(
            select(AppUserModel).where(
                or_(
                    func.lower(AppUserModel.email) == normalized,
                    func.lower(AppUserModel.username) == normalized,
                )
            )
        )
        return _to_account(model) if model else None

    async def get_by_id(self, user_id) -> Account | None:
        model = await self._session.get(AppUserModel, user_id)
        return _to_account(model) if model else None

    async def get_admin_registration(self, account_id) -> AdminRegistration | None:
        model = await self._session.get(AdminRegistrationModel, account_id)
        return _to_admin_registration(model) if model else None

    async def get_admin_registration_by_username(
        self, username: str
    ) -> AdminRegistration | None:
        model = await self._session.scalar(
            select(AdminRegistrationModel).where(
                AdminRegistrationModel.username == username.strip().lower()
            )
        )
        return _to_admin_registration(model) if model else None

    async def add_admin_registration(
        self, account: Account, registration: AdminRegistration
    ) -> None:
        if account.id != registration.account_id:
            raise ValueError("계정과 관리자 가입 신청의 사용자 ID가 일치해야 합니다.")
        await self.add_user(
            account,
            Profile(account.id, registration.display_name),
            registration.username,
        )
        self._session.add(
            AdminRegistrationModel(
                account_id=registration.account_id,
                username=registration.username,
                email=account.email,
                display_name=registration.display_name,
                status=registration.status.value,
            )
        )

    async def add_user(
        self, account: Account, profile: Profile, username: str
    ) -> None:
        if account.id != profile.user_id:
            raise ValueError("계정과 프로필의 사용자 ID가 일치해야 합니다.")
        # 호출 측 UnitOfWork가 한 번만 commit하므로 어느 단계든 실패하면 전부 롤백된다.
        await self._session.execute(
            text("insert into auth.users (id, email) values (:id, :email)"),
            {"id": account.id, "email": account.email},
        )
        self._session.add(
            AppUserModel(
                id=account.id,
                supabase_user_id=account.id,
                email=account.email,
                username=username,
                password_hash=account.password_hash,
                role=account.role.value,
                is_active=account.is_active,
            )
        )
        self._session.add(ProfileModel(id=profile.user_id, nickname=profile.nickname))
        await self._session.flush()

    async def add_oauth_user(self, account: Account, profile: Profile) -> None:
        if account.id != profile.user_id:
            raise ValueError("계정과 프로필의 사용자 ID가 일치해야 합니다.")
        # Supabase OAuth가 auth.users 행을 먼저 만들었으므로 중복 INSERT하지 않는다.
        self._session.add(
            AppUserModel(
                id=account.id,
                supabase_user_id=account.id,
                email=account.email,
                username=None,
                password_hash=account.password_hash,
                role=account.role.value,
                is_active=account.is_active,
            )
        )
        self._session.add(ProfileModel(id=profile.user_id, nickname=profile.nickname))
        await self._session.flush()

    async def get_profile(self, user_id) -> Profile | None:
        model = await self._session.get(ProfileModel, user_id)
        return _to_profile(model) if model else None

    async def save_profile(self, profile: Profile) -> None:
        model = await self._session.get(ProfileModel, profile.user_id)
        if model is None:
            raise LookupError("프로필을 찾을 수 없습니다.")
        model.nickname = profile.nickname
        shipping = profile.shipping_address
        model.recipient_name = shipping.recipient_name if shipping else None
        model.recipient_phone = shipping.recipient_phone if shipping else None
        model.postal_code = shipping.postal_code if shipping else None
        model.address = shipping.address if shipping else None
        model.address_detail = shipping.address_detail if shipping else None
        await self._session.flush()

    async def revoke_token(self, jti, user_id, expires_at) -> None:
        self._session.add(
            RevokedTokenModel(jti=jti, user_id=user_id, expires_at=expires_at)
        )
        await self._session.flush()

    async def is_token_revoked(self, jti: str) -> bool:
        found = await self._session.scalar(
            select(RevokedTokenModel.jti).where(RevokedTokenModel.jti == jti)
        )
        return found is not None


class SqlAlchemyAccountUnitOfWork:
    def __init__(self, session: AsyncSession):
        self._session = session
        self.repo = SqlAlchemyAccountRepository(session)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
