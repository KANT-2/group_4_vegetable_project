"""관리자 상품 등록·수정·삭제 실제 DB 테스트. 'test-' 상품·계정만 만들고 끝나면 지운다.
DATABASE_URL·JWT_SECRET_KEY 가 없으면 건너뛴다.
"""

from io import BytesIO
from uuid import uuid4

import pytest
from PIL import Image

from tests.purchases_db import CART, DB_READY, ORDERS, SHIPPING, SKIP_REASON, purchase_env

pytestmark = pytest.mark.skipif(not DB_READY, reason=SKIP_REASON)
ADMIN = "/api/v1/catalog/admin/products"


@pytest.fixture
async def env():
    async with purchase_env() as e:
        yield e


async def admin_headers(env):
    _, headers = await env.make_user()
    await env.execute("update public.app_users set role='admin' where id=:id", id=env.user_ids[-1])
    return headers


def new_body(env, **overrides):
    product_id = f"test-{uuid4().hex[:10]}"
    env.product_ids.append(product_id)  # 실패해도 정리되게 먼저 기록
    return {
        "id": product_id, "name": "흙당근", "unit": "1kg (5~8개)", "farm_name": "테스트농장",
        "farm_region": "전라남도 해남", "vegetable_id": env.vegetable_id, "ugly_reason": "bent",
        "price": 2900, "stock": 20, "is_active": True, **overrides,
    }


async def test_only_admin_can_register_and_duplicate_id_is_rejected(env):
    _, user = await env.make_user()
    admin = await admin_headers(env)
    body = new_body(env)
    assert (await env.client.post(ADMIN, json=body, headers=user)).status_code == 403
    created = await env.client.post(ADMIN, json=body, headers=admin)
    assert created.status_code == 201, created.text
    product = created.json()
    assert (product["name"], product["unit"], product["farm_region"], product["stock"]) == ("흙당근", "1kg (5~8개)", "전라남도 해남", 20)
    assert product["original_price"] == product["price"] == 2900
    assert (await env.client.post(ADMIN, json=body, headers=admin)).status_code == 409
    bad = new_body(env, id="Bad_ID")
    assert (await env.client.post(ADMIN, json=bad, headers=admin)).status_code == 422
    unknown = new_body(env, vegetable_id="no-such-vegetable")
    assert (await env.client.post(ADMIN, json=unknown, headers=admin)).status_code == 422


async def test_admin_edits_all_fields_and_customer_sees_them(env):
    admin = await admin_headers(env)
    body = new_body(env)
    assert (await env.client.post(ADMIN, json=body, headers=admin)).status_code == 201
    url = f"{ADMIN}/{body['id']}"
    changed = await env.client.patch(url, json={
        "name": "꿀고구마", "unit": "2kg", "farm_name": "여주 고구마농원", "farm_region": "경기도 여주",
        "ugly_reason": "small", "original_price": 5000, "price": 4000, "stock": 3,
    }, headers=admin)
    assert changed.status_code == 200, changed.text
    seen = (await env.client.get(f"/api/v1/catalog/products/{body['id']}")).json()
    assert (seen["name"], seen["unit"], seen["farm_region"], seen["price"], seen["stock"]) == ("꿀고구마", "2kg", "경기도 여주", 4000, 3)
    # 판매가가 정상가보다 크면 하나도 바꾸지 않는다
    assert (await env.client.patch(url, json={"name": "바뀌면 안 됨", "price": 9000}, headers=admin)).status_code == 422
    assert (await env.client.get(f"/api/v1/catalog/products/{body['id']}")).json()["name"] == "꿀고구마"
    # 판매 중지(휴지통)면 고객 화면에서 사라진다
    assert (await env.client.patch(url, json={"is_active": False}, headers=admin)).status_code == 200
    assert (await env.client.get(f"/api/v1/catalog/products/{body['id']}")).status_code == 404


async def test_permanent_delete_keeps_ordered_products(env):
    admin = await admin_headers(env)
    fresh, ordered = new_body(env), new_body(env)
    for body in (fresh, ordered):
        assert (await env.client.post(ADMIN, json=body, headers=admin)).status_code == 201
    _, buyer = await env.make_user()
    assert (await env.client.post(f"{CART}/items", json={"product_id": ordered["id"], "quantity": 1}, headers=buyer)).status_code == 201
    order = {"request_key": str(uuid4()), "shipping": dict(SHIPPING), "payment_method": "card"}
    assert (await env.client.post(ORDERS, json=order, headers=buyer)).status_code == 201

    assert (await env.client.delete(f"{ADMIN}/{fresh['id']}", headers=admin)).status_code == 204
    assert await env.scalar("select count(*) from public.products where id=:id", id=fresh["id"]) == 0
    refused = await env.client.delete(f"{ADMIN}/{ordered['id']}", headers=admin)
    assert refused.status_code == 409 and "주문 기록" in refused.json()["detail"]
    assert await env.scalar("select count(*) from public.products where id=:id", id=ordered["id"]) == 1


async def test_uploaded_image_is_reencoded_and_served(env):
    if not await env.scalar("select to_regclass('public.product_images') is not null"):
        pytest.skip("product_images 마이그레이션(202610260007)을 아직 적용하지 않았습니다.")
    admin = await admin_headers(env)
    body = new_body(env)
    assert (await env.client.post(ADMIN, json=body, headers=admin)).status_code == 201
    png = BytesIO()
    Image.new("RGB", (40, 30), "orange").save(png, "PNG")
    url = f"{ADMIN}/{body['id']}/image"
    assert (await env.client.put(url, files={"image": ("x.png", b"<html>", "image/png")}, headers=admin)).status_code == 422
    uploaded = await env.client.put(url, files={"image": ("x.png", png.getvalue(), "image/png")}, headers=admin)
    assert uploaded.status_code == 200, uploaded.text
    assert uploaded.json()["image_path"].startswith(f"/api/product-images/{body['id']}?v=")
    served = await env.client.get(f"/api/v1/catalog/products/{body['id']}/image")
    assert served.headers["content-type"] == "image/jpeg" and served.content[:2] == b"\xff\xd8"
