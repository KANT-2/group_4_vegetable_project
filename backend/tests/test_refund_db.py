"""환불 신청 실제 DB 테스트. 실제 계정·토큰으로 팀 DB 의 refund_requests 에 접수되는지 검증한다.
DATABASE_URL·JWT_SECRET_KEY 가 없으면 건너뛴다. 만든 계정·상품·주문은 'test-' 접두어이고 끝나면 모두 지운다
(환불 신청은 주문이 지워질 때 함께 지워진다).
"""

import asyncio
from uuid import uuid4

import pytest

from tests.purchases_db import CART, DB_READY, ORDERS, SHIPPING, SKIP_REASON, purchase_env

pytestmark = pytest.mark.skipif(not DB_READY, reason=SKIP_REASON)

REASON = "맛이 없어서 환불하고 싶어요"


@pytest.fixture
async def env():
    async with purchase_env() as e:
        yield e


def order_body(**overrides):
    return {"request_key": str(uuid4()), "shipping": dict(SHIPPING), "payment_method": "card", **overrides}


async def make_order(env, user_headers, product_id):
    r = await env.client.post(f"{CART}/items", json={"product_id": product_id, "quantity": 1}, headers=user_headers)
    assert r.status_code == 201, r.text
    r = await env.client.post(ORDERS, json=order_body(), headers=user_headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def refund_rows(env, order_id):
    return await env.rows("select status, reason, reviewed_at from public.refund_requests where order_id=:o", o=order_id)


async def test_refund_request_is_saved_and_shown_in_detail_and_refund_list(env):
    user_id, headers = await env.make_user()
    product = await env.new_product(price=2_900)
    order_id = await make_order(env, headers, product)
    other_order = await make_order(env, headers, product)

    r = await env.client.post(f"{ORDERS}/{order_id}/refund", json={"reason": "  " + REASON + "  "}, headers=headers)
    assert r.status_code == 201, r.text
    assert (r.json()["status"], r.json()["reason"]) == ("requested", REASON)

    rows = await refund_rows(env, order_id)
    assert [tuple(row) for row in rows] == [("requested", REASON, None)]  # DB 에 접수 1건, 아직 검토 전
    assert await refund_rows(env, other_order) == []

    detail = (await env.client.get(f"{ORDERS}/{order_id}", headers=headers)).json()
    assert detail["refund"]["status"] == "requested" and detail["refund"]["reason"] == REASON
    assert (await env.client.get(f"{ORDERS}/{other_order}", headers=headers)).json()["refund"] is None

    listed = (await env.client.get(ORDERS, params={"refunds_only": "true"}, headers=headers)).json()
    assert [o["id"] for o in listed["items"]] == [order_id] and listed["total"] == 1
    everything = (await env.client.get(ORDERS, headers=headers)).json()
    assert everything["total"] == 2


async def test_requesting_again_keeps_the_first_request(env):
    _, headers = await env.make_user()
    order_id = await make_order(env, headers, await env.new_product())
    url = f"{ORDERS}/{order_id}/refund"
    assert (await env.client.post(url, json={"reason": REASON}, headers=headers)).status_code == 201
    again = await env.client.post(url, json={"reason": "다른 사유를 적어서 다시 신청해 봅니다 두번째"}, headers=headers)
    assert again.status_code == 200 and again.json()["reason"] == REASON
    assert len(await refund_rows(env, order_id)) == 1


async def test_double_submit_at_the_same_time_creates_one_request(env):
    _, headers = await env.make_user()
    order_id = await make_order(env, headers, await env.new_product())
    url = f"{ORDERS}/{order_id}/refund"
    results = await asyncio.gather(*[env.client.post(url, json={"reason": REASON}, headers=headers) for _ in range(2)])
    assert sorted(r.status_code for r in results) == [200, 201]
    assert len(await refund_rows(env, order_id)) == 1


async def test_invalid_reason_other_users_and_unpaid_orders_are_rejected(env):
    user_id, headers = await env.make_user()
    _, other_headers = await env.make_user()
    order_id = await make_order(env, headers, await env.new_product())
    url = f"{ORDERS}/{order_id}/refund"

    assert (await env.client.post(url, json={"reason": "짧아요"}, headers=headers)).status_code == 422
    assert (await env.client.post(url, json={"reason": "가" * 501}, headers=headers)).status_code == 422
    assert (await env.client.post(url, json={"reason": REASON}, headers=other_headers)).status_code == 404  # 남의 주문
    assert (await env.client.post(f"{ORDERS}/{uuid4()}/refund", json={"reason": REASON}, headers=headers)).status_code == 404
    assert (await env.client.post(url, json={"reason": REASON})).status_code == 401
    assert await refund_rows(env, order_id) == []  # 거부된 요청은 아무것도 저장하지 않는다

    await env.execute("update public.orders set status='pending', paid_at=null where id=:o", o=order_id)
    r = await env.client.post(url, json={"reason": REASON}, headers=headers)
    assert r.status_code == 409  # 결제 완료 주문만
    assert await refund_rows(env, order_id) == []


async def test_junk_postal_code_and_address_are_rejected_without_saving(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    await env.client.post(f"{CART}/items", json={"product_id": product, "quantity": 2}, headers=headers)
    junk = {**SHIPPING, "postal_code": "11111", "address": "1111111111111111", "address_detail": "11111111"}
    r = await env.client.post(ORDERS, json=order_body(shipping=junk), headers=headers)
    assert r.status_code == 422
    assert await env.scalar("select count(*) from public.orders where user_id=:u", u=user_id) == 0
    assert await env.scalar("select count(*) from public.cart_items where user_id=:u", u=user_id) == 1  # 장바구니는 그대로


async def test_phone_with_hyphens_is_accepted_and_saved_as_digits(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    await env.client.post(f"{CART}/items", json={"product_id": product, "quantity": 1}, headers=headers)
    shipping = {**SHIPPING, "recipient_phone": "010-1234-5678"}
    r = await env.client.post(ORDERS, json=order_body(shipping=shipping), headers=headers)
    assert r.status_code == 201, r.text
    assert r.json()["shipping"]["recipient_phone"] == "01012345678"
    # DB 에도 하이픈 없이 숫자만 저장된다
    assert await env.scalar("select recipient_phone from public.orders where user_id=:u", u=user_id) == "01012345678"
