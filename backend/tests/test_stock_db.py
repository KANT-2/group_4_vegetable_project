"""재고 실제 DB 테스트. 팀 DB 에서 담기 제한 → 주문 시 차감 → 품절 → 마지막 재고 동시 주문을 검증한다.
DATABASE_URL·JWT_SECRET_KEY 가 없으면 건너뛴다. 만든 계정·상품·주문은 'test-' 접두어이고 끝나면 모두 지운다.
"""

import asyncio
from uuid import uuid4

import pytest

from tests.purchases_db import CART, DB_READY, ORDERS, SHIPPING, SKIP_REASON, purchase_env

pytestmark = pytest.mark.skipif(not DB_READY, reason=SKIP_REASON)


@pytest.fixture
async def env():
    async with purchase_env() as e:
        yield e


def order_body():
    return {"request_key": str(uuid4()), "shipping": dict(SHIPPING), "payment_method": "card"}


async def stock_of(env, product_id):
    return await env.scalar("select stock from public.products where id=:id", id=product_id)


async def test_new_products_start_with_demo_stock_of_20(env):
    product = await env.new_product()
    assert await stock_of(env, product) == 20
    detail = await env.client.get(f"/api/v1/catalog/products/{product}")
    assert detail.json()["stock"] == 20


async def test_cart_limits_to_stock_and_order_decreases_it_until_sold_out(env):
    _, headers = await env.make_user()
    product = await env.new_product()
    await env.execute("update public.products set stock=2 where id=:id", id=product)

    over = await env.client.post(f"{CART}/items", json={"product_id": product, "quantity": 3}, headers=headers)
    assert over.status_code == 409
    assert over.json()["available"] == 2 and "2개까지만" in over.json()["detail"]

    added = await env.client.post(f"{CART}/items", json={"product_id": product, "quantity": 2}, headers=headers)
    assert added.status_code == 201 and added.json()["stock"] == 2
    assert (await env.client.post(ORDERS, json=order_body(), headers=headers)).status_code == 201
    assert await stock_of(env, product) == 0

    # 재고가 0이면 판매 중이어도 품절: 상세에는 보이지만 담을 수 없다
    assert (await env.client.get(f"/api/v1/catalog/products/{product}")).json()["stock"] == 0
    sold_out = await env.client.post(f"{CART}/items", json={"product_id": product, "quantity": 1}, headers=headers)
    assert sold_out.status_code == 409 and sold_out.json()["available"] == 0


async def test_last_unit_is_sold_to_only_one_of_concurrent_buyers(env):
    product = await env.new_product()
    await env.execute("update public.products set stock=1 where id=:id", id=product)
    buyers = [await env.make_user() for _ in range(3)]
    for _, headers in buyers:  # 담기는 재고를 잡아 두지 않으니 셋 다 담을 수 있다
        r = await env.client.post(f"{CART}/items", json={"product_id": product, "quantity": 1}, headers=headers)
        assert r.status_code == 201
    # 팀 DB 풀러의 동시 접속 한도(15개)를 팀원과 나눠 쓰므로 동시 요청은 3개로 제한한다.
    results = await asyncio.gather(
        *[env.client.post(ORDERS, json=order_body(), headers=headers) for _, headers in buyers]
    )
    assert sorted(r.status_code for r in results) == [201, 409, 409]
    assert await stock_of(env, product) == 0
    paid = await env.scalar("select coalesce(sum(quantity), 0) from public.order_items where product_id=:id", id=product)
    assert paid == 1  # 초과 판매 없음


async def test_admin_sets_stock_and_validation_rejects_negative(env):
    _, admin = await env.make_user()
    product = await env.new_product()
    await env.execute("update public.app_users set role='admin' where id=:id", id=env.user_ids[-1])
    url = f"/api/v1/catalog/admin/products/{product}"
    assert (await env.client.patch(url, json={"stock": -1}, headers=admin)).status_code == 422
    changed = await env.client.patch(url, json={"stock": 7}, headers=admin)
    assert changed.status_code == 200, changed.text
    assert changed.json()["stock"] == 7 and await stock_of(env, product) == 7
