"""주문 실제 DB 테스트. 실제 계정·토큰으로 팀 DB 에서 장바구니 → 주문 → 재조회 전 과정을 검증한다.
DATABASE_URL·JWT_SECRET_KEY 가 없으면 건너뛴다. 만든 계정·상품·주문은 'test-' 접두어이고 끝나면 모두 지운다.
"""

import asyncio
from uuid import uuid4

import pytest

from app.infrastructure.purchases.order_repository import SqlAlchemyOrderRepository
from tests.purchases_db import CART, DB_READY, ORDERS, SHIPPING, SKIP_REASON, purchase_env

pytestmark = pytest.mark.skipif(not DB_READY, reason=SKIP_REASON)


@pytest.fixture
async def env():
    async with purchase_env() as e:
        yield e


def order_body(**overrides):
    return {"request_key": str(uuid4()), "shipping": dict(SHIPPING), "payment_method": "card", **overrides}


async def add(env, headers, product_id, quantity):
    r = await env.client.post(f"{CART}/items", json={"product_id": product_id, "quantity": quantity}, headers=headers)
    assert r.status_code == 201, r.text


async def order_count(env, user_id):
    return await env.scalar("select count(*) from public.orders where user_id=:u", u=user_id)


async def cart_rows(env, user_id):
    return await env.scalar("select count(*) from public.cart_items where user_id=:u", u=user_id)


async def test_login_is_required_and_logged_out_token_gets_401(env):
    assert (await env.client.post(ORDERS, json=order_body())).status_code == 401
    assert (await env.client.get(ORDERS)).status_code == 401
    _, headers = await env.make_user()
    assert (await env.client.get(ORDERS, headers=headers)).status_code == 200
    assert (await env.client.post("/api/v1/accounts/logout", headers=headers)).status_code in (200, 204)
    assert (await env.client.get(ORDERS, headers=headers)).status_code == 401
    assert (await env.client.post(ORDERS, json=order_body(), headers=headers)).status_code == 401


async def test_cart_to_order_to_lookup_flow_against_real_db(env):
    user_id, headers = await env.make_user()
    carrot = await env.new_product(price=2_900, name="테스트 당근", unit="1kg")
    apple = await env.new_product(price=12_900, name="테스트 사과", unit="2kg")
    await add(env, headers, carrot, 2)  # 5,800
    await add(env, headers, apple, 1)  # 12,900 → 18,700 (배송비 3,500)

    r = await env.client.post(ORDERS, json=order_body(expected_total_amount=22_200, payment_method="easy_pay"), headers=headers)
    assert r.status_code == 201, r.text
    order = r.json()
    assert (order["status"], order["payment_method"]) == ("paid", "easy_pay")
    assert (order["items_total"], order["shipping_fee"], order["total_amount"]) == (18_700, 3_500, 22_200)

    # DB 에는 주문 1건·주문 상품 2건이 저장되고 장바구니는 비워진다
    row = (await env.rows(
        "select status, total_amount, shipping_fee, payment_method, recipient_name, postal_code, address_detail, paid_at "
        "from public.orders where user_id=:u", u=user_id))[0]
    assert tuple(row)[:4] == ("paid", 22_200, 3_500, "easy_pay")
    assert (row[4], row[5], row[6]) == (SHIPPING["recipient_name"], SHIPPING["postal_code"], SHIPPING["address_detail"])
    assert row[7] is not None
    items = await env.rows("select product_id, product_name, product_unit, unit_price, quantity from public.order_items "
                           "where order_id=:o order by product_id", o=order["id"])
    assert sorted(tuple(i) for i in items) == sorted([(carrot, "테스트 당근", "1kg", 2_900, 2), (apple, "테스트 사과", "2kg", 12_900, 1)])
    assert await cart_rows(env, user_id) == 0

    # 재조회: 상세와 목록
    detail = await env.client.get(f"{ORDERS}/{order['id']}", headers=headers)
    assert detail.status_code == 200 and detail.json() == order
    listing = (await env.client.get(ORDERS, headers=headers)).json()
    assert (listing["total"], [o["id"] for o in listing["items"]]) == (1, [order["id"]])


async def test_snapshot_is_kept_when_product_changes_later(env):
    user_id, headers = await env.make_user()
    product = await env.new_product(price=3_000, name="원래 이름")
    await add(env, headers, product, 1)
    order = (await env.client.post(ORDERS, json=order_body(), headers=headers)).json()
    await env.set_price(product, 9_900)
    await env.execute("update public.products set name='바뀐 이름' where id=:id", id=product)
    seen = (await env.client.get(f"{ORDERS}/{order['id']}", headers=headers)).json()
    assert (seen["items"][0]["product_name"], seen["items"][0]["unit_price"], seen["total_amount"]) == ("원래 이름", 3_000, 6_500)


@pytest.mark.parametrize(("price", "fee"), [(19_999, 3_500), (20_000, 0)])
async def test_shipping_fee_boundary_in_db(env, price, fee):
    user_id, headers = await env.make_user()
    product = await env.new_product(price=price)
    await add(env, headers, product, 1)
    order = (await env.client.post(ORDERS, json=order_body(), headers=headers)).json()
    assert (order["shipping_fee"], order["total_amount"]) == (fee, price + fee)
    assert await env.scalar("select shipping_fee from public.orders where user_id=:u", u=user_id) == fee


async def test_same_request_key_returns_existing_order(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    await add(env, headers, product, 2)
    payload = order_body()
    first = await env.client.post(ORDERS, json=payload, headers=headers)
    await add(env, headers, product, 1)  # 첫 주문 뒤 새로 담은 상품
    again = await env.client.post(ORDERS, json=payload, headers=headers)
    assert (first.status_code, again.status_code) == (201, 200)
    assert again.json()["id"] == first.json()["id"]
    assert await order_count(env, user_id) == 1
    assert await cart_rows(env, user_id) == 1  # 재요청이 새 장바구니를 건드리지 않는다


async def test_concurrent_requests_with_same_key_create_one_order(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    await add(env, headers, product, 2)
    payload = order_body()
    results = await asyncio.gather(*[env.client.post(ORDERS, json=payload, headers=headers) for _ in range(6)])
    assert sorted(r.status_code for r in results) == [200] * 5 + [201]
    assert len({r.json()["id"] for r in results}) == 1
    assert await order_count(env, user_id) == 1
    assert await env.scalar("select count(*) from public.order_items oi join public.orders o on o.id=oi.order_id "
                            "where o.user_id=:u", u=user_id) == 1


async def test_new_key_after_cart_was_cleared_does_not_create_second_order(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    await add(env, headers, product, 1)
    assert (await env.client.post(ORDERS, json=order_body(), headers=headers)).status_code == 201
    assert (await env.client.post(ORDERS, json=order_body(), headers=headers)).status_code == 409  # 빈 장바구니
    assert await order_count(env, user_id) == 1


async def test_rejections_keep_cart_and_save_nothing(env):
    user_id, headers = await env.make_user()
    # 빈 장바구니
    assert (await env.client.post(ORDERS, json=order_body(), headers=headers)).status_code == 409

    sold = await env.new_product(price=3_000)
    keep = await env.new_product(price=4_000)
    await add(env, headers, sold, 1)
    await add(env, headers, keep, 2)  # 3,000 + 8,000 = 11,000 + 배송비 3,500 = 14,500
    # 화면 금액을 조작(낮춤)하면 서버 기준과 달라 거부된다
    assert (await env.client.post(ORDERS, json=order_body(expected_total_amount=100), headers=headers)).status_code == 409
    # 잘못된 배송지·결제 수단
    assert (await env.client.post(ORDERS, json=order_body(shipping={**SHIPPING, "address_detail": " "}), headers=headers)).status_code == 422
    assert (await env.client.post(ORDERS, json=order_body(payment_method="cash"), headers=headers)).status_code == 422
    # 판매 중지 상품이 담겨 있으면 거부
    await env.set_active(sold, False)
    assert (await env.client.post(ORDERS, json=order_body(), headers=headers)).status_code == 409

    assert await order_count(env, user_id) == 0
    assert await cart_rows(env, user_id) == 2  # 장바구니는 그대로


async def test_server_amount_is_used_even_if_client_sends_none(env):
    user_id, headers = await env.make_user()
    product = await env.new_product(price=5_000)
    await add(env, headers, product, 3)  # 15,000 + 3,500
    order = (await env.client.post(ORDERS, json=order_body(), headers=headers)).json()
    assert order["total_amount"] == 18_500
    assert await env.scalar("select total_amount from public.orders where user_id=:u", u=user_id) == 18_500


async def test_other_users_cannot_see_or_reuse_orders(env):
    a_id, a = await env.make_user()
    b_id, b = await env.make_user()
    product = await env.new_product()
    await add(env, a, product, 1)
    order_a = (await env.client.post(ORDERS, json=order_body(), headers=a)).json()

    assert (await env.client.get(f"{ORDERS}/{order_a['id']}", headers=b)).status_code == 404
    assert (await env.client.get(ORDERS, headers=b)).json()["total"] == 0
    # B 의 장바구니는 A 의 주문과 무관하다: 같은 request_key 를 써도 B 는 자기 주문을 따로 만든다
    await add(env, b, product, 1)
    same_key = order_body(request_key=str(uuid4()))
    own = await env.client.post(ORDERS, json=same_key, headers=b)
    assert own.status_code == 201 and own.json()["id"] != order_a["id"]
    assert await order_count(env, a_id) == 1 and await order_count(env, b_id) == 1


async def test_failure_midway_rolls_back_order_and_keeps_cart(env, monkeypatch):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    await add(env, headers, product, 2)

    async def broken(self, user_id, product_ids):
        raise RuntimeError("장바구니 정리 중 장애")

    monkeypatch.setattr(SqlAlchemyOrderRepository, "remove_cart_items", broken)
    with pytest.raises(RuntimeError):
        await env.client.post(ORDERS, json=order_body(), headers=headers)
    monkeypatch.undo()

    # 주문과 주문 상품은 저장되지 않고, 장바구니는 그대로다
    assert await order_count(env, user_id) == 0
    assert await env.scalar("select count(*) from public.order_items oi join public.orders o on o.id=oi.order_id "
                            "where o.user_id=:u", u=user_id) == 0
    assert await cart_rows(env, user_id) == 1
    # 장애가 풀린 뒤 같은 요청을 다시 보내면 정상 처리된다
    assert (await env.client.post(ORDERS, json=order_body(), headers=headers)).status_code == 201


async def test_list_is_newest_first_and_paged(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    ids = []
    for _ in range(3):
        await add(env, headers, product, 1)
        ids.append((await env.client.post(ORDERS, json=order_body(), headers=headers)).json()["id"])
        await asyncio.sleep(0.02)
    page1 = (await env.client.get(ORDERS, params={"page": 1, "size": 2}, headers=headers)).json()
    page2 = (await env.client.get(ORDERS, params={"page": 2, "size": 2}, headers=headers)).json()
    assert page1["total"] == 3
    assert [o["id"] for o in page1["items"]] == [ids[2], ids[1]] and [o["id"] for o in page2["items"]] == [ids[0]]
