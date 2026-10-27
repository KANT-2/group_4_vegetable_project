import { MAX_CART_QUANTITY } from "@/schemas/cart";

// 재고 표시·구매 수량 제한 공통 규칙. 실제 재고 확인·차감은 서버(FastAPI)가 하고,
// 화면은 미리 막고 안내만 해요. (화면이 본 재고는 그사이 다른 손님의 결제로 줄어 있을 수 있어요.)

// 이 개수 이하로 남으면 "품절 임박"으로 강조해요.
export const LOW_STOCK = 5;

// 한 번에 담을 수 있는 최대 수량: 남은 재고와 장바구니 한도(99개) 중 작은 값.
// stock 이 없으면(재고를 관리하지 않는 예전 상품) 장바구니 한도만 적용해요.
export function maxPurchasable(stock?: number) {
  return stock === undefined
    ? MAX_CART_QUANTITY
    : Math.min(stock, MAX_CART_QUANTITY);
}

export function stockLimitMessage(available: number, inCart = 0) {
  if (available <= 0) return "재고가 모두 소진되어 품절됐어요.";
  const message = `재고가 ${available}개 남아 ${available}개까지만 구매할 수 있어요.`;
  return inCart > 0
    ? `${message} (장바구니에 이미 ${inCart}개가 담겨 있어요.)`
    : message;
}
