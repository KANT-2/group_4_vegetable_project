"""마이페이지 조회 결과."""

from dataclasses import dataclass

from app.domain.accounts.models import Account, Profile


@dataclass(frozen=True)
class MyAccount:
    account: Account
    profile: Profile
