import "server-only";
import { fastApi } from "@/lib/fastapi";

// FastAPI 장바구니·주문 API(/api/v1/purchases) 호출. 사용자는 토큰으로만 정해지고 요청에 user_id 를 싣지 않아요.

export type ApiCartLine = {
  product_id: string;
  name: string;
  unit: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  is_active: boolean;
  image_path: string | null;
};
export type ApiCart = { items: ApiCartLine[]; subtotal_amount: number };

export type ApiShipping = {
  recipient_name: string;
  recipient_phone: string;
  postal_code: string;
  address: string;
  address_detail: string | null;
};
export type ApiOrderItem = {
  product_id: string;
  product_name: string;
  product_unit: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};
export type ApiOrder = {
  id: string;
  status: string;
  payment_method: string | null;
  shipping: ApiShipping;
  items: ApiOrderItem[];
  items_total: number;
  shipping_fee: number;
  total_amount: number;
  paid_at: string | null;
  created_at: string;
};
export type ApiOrderList = {
  items: ApiOrder[];
  total: number;
  page: number;
  size: number;
};

export type ApiOrderInput = {
  request_key: string;
  shipping: {
    recipient_name: string;
    recipient_phone: string;
    postal_code: string;
    address: string;
    address_detail: string;
  };
  payment_method: "card" | "bank_transfer" | "easy_pay";
  expected_total_amount?: number;
};

const CART = "/api/v1/purchases/cart";
const ORDERS = "/api/v1/purchases/orders";
const json = (body: unknown) => ({ body: JSON.stringify(body) });

export const apiGetCart = (token: string) => fastApi<ApiCart>(CART, {}, token);

export const apiAddToCart = (
  token: string,
  productId: string,
  quantity: number,
) =>
  fastApi<ApiCartLine>(
    `${CART}/items`,
    { method: "POST", ...json({ product_id: productId, quantity }) },
    token,
  );

export const apiChangeQuantity = (
  token: string,
  productId: string,
  quantity: number,
) =>
  fastApi<ApiCartLine>(
    `${CART}/items/${encodeURIComponent(productId)}`,
    { method: "PATCH", ...json({ quantity }) },
    token,
  );

export const apiRemoveFromCart = (token: string, productId: string) =>
  fastApi<void>(
    `${CART}/items/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
    token,
  );

// 비회원 장바구니 전체를 한 번에 합쳐요. 서버는 수량을 더하지 않고 기존·비회원 수량 중 큰 값으로 맞추므로
// 응답이 유실돼 같은 요청을 다시 보내도(또는 두 탭에서 동시에 보내도) 결과가 같아요.
export type ApiMergeResult = { merged: number; skipped_product_ids: string[] };
export const apiMergeCart = (
  token: string,
  items: { product_id: string; quantity: number }[],
) =>
  fastApi<ApiMergeResult>(
    `${CART}/merge`,
    { method: "POST", ...json({ items }) },
    token,
  );

export const apiPlaceOrder = (token: string, input: ApiOrderInput) =>
  fastApi<ApiOrder>(ORDERS, { method: "POST", ...json(input) }, token);

export const apiGetOrders = (token: string, page: number, size: number) =>
  fastApi<ApiOrderList>(`${ORDERS}?page=${page}&size=${size}`, {}, token);

export const apiGetOrder = (token: string, orderId: string) =>
  fastApi<ApiOrder>(`${ORDERS}/${encodeURIComponent(orderId)}`, {}, token);
