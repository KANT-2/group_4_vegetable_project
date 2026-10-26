"""장바구니 실제 DB 테스트. 실제 계정 생성 → 실제 로그인 토큰 → 팀 DB 로 검증한다. DATABASE_URL·JWT_SECRET_KEY 가 없으면 건너뛴다.

만든 계정·상품은 'test-' 접두어이고 끝나면 모두 지운다. 기존 상품·사용자 행은 바꾸지 않는다.
"""

import asyncio

import pytest

from tests.purchases_db import CART, DB_READY, SKIP_REASON, purchase_env

pytestmark = pytest.mark.skipif(not DB_READY, reason=SKIP_REASON)


@pytest.fixture
async def env():
    async with purchase_env() as e:
        yield e


async def add(env, headers, product_id, quantity):
    return await env.client.post(f"{CART}/items", json={"product_id": product_id, "quantity": quantity}, headers=headers)


async def test_login_is_required_and_garbage_token_is_rejected(env):
    assert (await env.client.get(CART)).status_code == 401
    assert (await env.client.get(CART, headers={"Authorization": "Bearer not.a.token"})).status_code == 401


async def test_logged_out_token_gets_401(env):
    _, headers = await env.make_user()
    product = await env.new_product()
    assert (await env.client.get(CART, headers=headers)).status_code == 200  # 로그아웃 전에는 통과
    assert (await env.client.post("/api/v1/accounts/logout", headers=headers)).status_code in (200, 204)
    assert (await env.client.get(CART, headers=headers)).status_code == 401
    assert (await add(env, headers, product, 1)).status_code == 401
    assert (await env.client.patch(f"{CART}/items/{product}", json={"quantity": 2}, headers=headers)).status_code == 401
    assert (await env.client.delete(f"{CART}/items/{product}", headers=headers)).status_code == 401


async def test_deactivated_account_gets_401(env):
    user_id, headers = await env.make_user()
    assert (await env.client.get(CART, headers=headers)).status_code == 200
    await env.execute("update public.app_users set is_active=false where id=:id", id=user_id)
    assert (await env.client.get(CART, headers=headers)).status_code == 401


async def test_add_change_remove_flow_against_real_db(env):
    user_id, headers = await env.make_user()
    carrot = await env.new_product(price=2_900, name="테스트 당근")
    apple = await env.new_product(price=12_900, name="테스트 사과", unit="2kg")

    r = await add(env, headers, carrot, 2)
    assert r.status_code == 201
    assert (r.json()["quantity"], r.json()["unit_price"], r.json()["line_total"]) == (2, 2_900, 5_800)
    assert (await add(env, headers, carrot, 3)).json()["quantity"] == 5  # 같은 상품은 합쳐진다
    await add(env, headers, apple, 1)

    r = await env.client.patch(f"{CART}/items/{carrot}", json={"quantity": 4}, headers=headers)
    assert (r.status_code, r.json()["quantity"], r.json()["line_total"]) == (200, 4, 11_600)

    cart = (await env.client.get(CART, headers=headers)).json()
    assert {i["product_id"]: i["quantity"] for i in cart["items"]} == {carrot: 4, apple: 1}
    assert cart["subtotal_amount"] == 11_600 + 12_900

    assert (await env.client.delete(f"{CART}/items/{apple}", headers=headers)).status_code == 204
    assert (await env.client.get(CART, headers=headers)).json()["subtotal_amount"] == 11_600
    # 실제 DB 에는 본인 행 1개만 남는다
    assert await env.scalar("select count(*) from public.cart_items where user_id=:u", u=user_id) == 1


async def test_invalid_input_saves_nothing(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    for quantity in (0, -1, 100):
        assert (await add(env, headers, product, quantity)).status_code == 422
    assert (await add(env, headers, "no-such-product", 1)).status_code == 404
    body = {"product_id": product, "quantity": 1, "user_id": str(user_id)}
    assert (await env.client.post(f"{CART}/items", json=body, headers=headers)).status_code == 422
    assert await env.scalar("select count(*) from public.cart_items where user_id=:u", u=user_id) == 0


async def test_other_users_cart_is_unreachable(env):
    a_id, a = await env.make_user()
    _, b = await env.make_user()
    product = await env.new_product()
    await add(env, a, product, 2)

    assert (await env.client.get(CART, headers=b)).json()["items"] == []
    assert (await env.client.patch(f"{CART}/items/{product}", json={"quantity": 50}, headers=b)).status_code == 404
    assert (await env.client.delete(f"{CART}/items/{product}", headers=b)).status_code == 404
    assert await env.scalar("select quantity from public.cart_items where user_id=:u", u=a_id) == 2  # A 것은 그대로


async def test_inactive_product_rules(env):
    user_id, headers = await env.make_user()
    retired = await env.new_product(active=False)
    assert (await add(env, headers, retired, 1)).status_code == 409  # 판매 중지 상품은 새로 담을 수 없다
    assert await env.scalar("select count(*) from public.cart_items where user_id=:u", u=user_id) == 0

    sold = await env.new_product(price=3_000)
    keep = await env.new_product(price=4_000)
    await add(env, headers, sold, 2)
    await add(env, headers, keep, 1)
    await env.set_active(sold, False)  # 담은 뒤 판매가 끝난 상황

    cart = (await env.client.get(CART, headers=headers)).json()
    assert {i["product_id"]: i["is_active"] for i in cart["items"]} == {sold: False, keep: True}
    assert cart["subtotal_amount"] == 4_000  # 줄은 보여 주되 합계에서 뺀다
    assert (await env.client.patch(f"{CART}/items/{sold}", json={"quantity": 5}, headers=headers)).status_code == 409
    assert (await env.client.delete(f"{CART}/items/{sold}", headers=headers)).status_code == 204


async def test_concurrent_adds_of_same_product_merge_without_error(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    # 팀 DB 풀러의 동시 접속 한도(15개)를 팀원과 나눠 쓰므로 동시 요청은 3개로 제한한다.
    results = await asyncio.gather(*[add(env, headers, product, 2) for _ in range(3)])
    assert [r.status_code for r in results] == [201] * 3
    assert await env.scalar("select count(*) from public.cart_items where user_id=:u", u=user_id) == 1
    assert await env.scalar("select quantity from public.cart_items where user_id=:u", u=user_id) == 6


async def test_concurrent_adds_cannot_exceed_limit(env):
    user_id, headers = await env.make_user()
    product = await env.new_product()
    assert (await add(env, headers, product, 90)).status_code == 201
    results = await asyncio.gather(add(env, headers, product, 6), add(env, headers, product, 6))
    assert sorted(r.status_code for r in results) == [201, 422]  # 96 은 되고 102 는 거부
    assert await env.scalar("select quantity from public.cart_items where user_id=:u", u=user_id) == 96
