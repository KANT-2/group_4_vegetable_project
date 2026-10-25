from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.domain.experiences.models import (
    AlreadyCancelled,
    CancellationNotAllowed,
    CapacityExceeded,
    DuplicateReservation,
    ExperienceSession,
    InvalidHeadcount,
    NotReservationOwner,
    SessionAlreadyStarted,
    SessionClosed,
    SessionStatus,
)

NOW = datetime(2026, 11, 1, 9, 0, tzinfo=timezone.utc)
USER = uuid4()


def make_session(**kw) -> ExperienceSession:
    defaults = dict(id=uuid4(), experience_id="kimjang", starts_at=NOW + timedelta(days=7), capacity=10)
    return ExperienceSession(**{**defaults, **kw})


def test_reserve_success_reduces_remaining():
    s = make_session()
    r = s.reserve(USER, 3, NOW, user_has_active_reservation=False)
    assert r.headcount == 3 and r.is_active
    assert s.remaining == 7


@pytest.mark.parametrize("n", [0, -1, 11])
def test_invalid_headcount(n):
    with pytest.raises(InvalidHeadcount):
        make_session().reserve(USER, n, NOW, False)


def test_capacity_exceeded():
    s = make_session(capacity=4, reserved_headcount=3)
    with pytest.raises(CapacityExceeded):
        s.reserve(USER, 2, NOW, False)


def test_closed_session_rejected():
    with pytest.raises(SessionClosed):
        make_session(status=SessionStatus.CLOSED).reserve(USER, 1, NOW, False)


def test_started_session_rejected():
    with pytest.raises(SessionAlreadyStarted):
        make_session(starts_at=NOW - timedelta(hours=1)).reserve(USER, 1, NOW, False)


def test_duplicate_active_reservation_rejected():
    with pytest.raises(DuplicateReservation):
        make_session().reserve(USER, 1, NOW, user_has_active_reservation=True)


def test_close_session_twice_rejected():
    s = make_session()
    s.close()
    assert s.status is SessionStatus.CLOSED
    with pytest.raises(SessionClosed):
        s.close()


def test_cancel_by_owner_before_deadline():
    s = make_session()
    r = s.reserve(USER, 2, NOW, False)
    r.cancel(USER, s.starts_at, NOW)
    s.release(r.headcount)
    assert not r.is_active and r.cancelled_at == NOW
    assert s.remaining == 10


def test_cancel_by_other_user_rejected():
    s = make_session()
    r = s.reserve(USER, 1, NOW, False)
    with pytest.raises(NotReservationOwner):
        r.cancel(uuid4(), s.starts_at, NOW)
    assert r.is_active


def test_cancel_twice_rejected():
    s = make_session()
    r = s.reserve(USER, 1, NOW, False)
    r.cancel(USER, s.starts_at, NOW)
    with pytest.raises(AlreadyCancelled):
        r.cancel(USER, s.starts_at, NOW)


def test_cancel_after_deadline_rejected():
    s = make_session(starts_at=NOW + timedelta(hours=23))
    r = s.reserve(USER, 1, NOW, False)
    with pytest.raises(CancellationNotAllowed):
        r.cancel(USER, s.starts_at, NOW)
    assert r.is_active
