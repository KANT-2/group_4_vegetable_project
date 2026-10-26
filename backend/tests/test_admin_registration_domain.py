from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.domain.accounts.models import AdminRegistration, AdminRegistrationStatus


def test_pending_registration_normalizes_username_and_name():
    registration = AdminRegistration(uuid4(), "  NewAdmin  ", "  관리자 신청자  ")

    assert registration.username == "newadmin"
    assert registration.display_name == "관리자 신청자"
    assert registration.status is AdminRegistrationStatus.PENDING


@pytest.mark.parametrize("username", ["abc", "has space", "한글아이디", "x" * 41])
def test_registration_rejects_invalid_username(username):
    with pytest.raises(ValueError):
        AdminRegistration(uuid4(), username, "관리자")


def test_pending_registration_cannot_have_review_information():
    with pytest.raises(ValueError):
        AdminRegistration(uuid4(), "newadmin", "관리자", reviewed_by=uuid4())


def test_processed_registration_requires_reviewer_and_time():
    with pytest.raises(ValueError):
        AdminRegistration(
            uuid4(),
            "newadmin",
            "관리자",
            status=AdminRegistrationStatus.APPROVED,
        )

    registration = AdminRegistration(
        uuid4(),
        "newadmin",
        "관리자",
        status=AdminRegistrationStatus.APPROVED,
        reviewed_by=uuid4(),
        reviewed_at=datetime.now(UTC),
    )
    assert registration.status is AdminRegistrationStatus.APPROVED
