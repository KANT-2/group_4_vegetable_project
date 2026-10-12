// 장바구니 한 줄. 판매 종료 등으로 상품을 읽을 수 없으면 available=false 예요.
export interface CartLine {
  productId: string;
  quantity: number;
  available: boolean;
  name: string;
  unit: string;
  price: number;
  originalPrice: number;
  imageUrl?: string;
}

export interface WishlistLine {
  productId: string;
  available: boolean;
  name: string;
  unit: string;
  price: number;
  originalPrice: number;
  imageUrl?: string;
}

export const FREE_SHIPPING_MINIMUM = 20_000;
export const STANDARD_SHIPPING_FEE = 3_500;

export function shippingFeeFor(subtotal: number) {
  return subtotal > 0 && subtotal < FREE_SHIPPING_MINIMUM
    ? STANDARD_SHIPPING_FEE
    : 0;
}

// 합계는 판매 중인 상품만 계산해요. 금액은 화면에 보여 줄 예상 금액이며,
// 주문 시 서버가 가격을 다시 확인합니다.
export function summarizeCart(lines: CartLine[]) {
  const buyable = lines.filter((line) => line.available);
  const originalTotal = buyable.reduce(
    (sum, line) => sum + line.originalPrice * line.quantity,
    0,
  );
  const total = buyable.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  return {
    kinds: buyable.length,
    quantity: buyable.reduce((sum, line) => sum + line.quantity, 0),
    originalTotal,
    discount: originalTotal - total,
    total,
    shippingFee: shippingFeeFor(total),
    orderTotal: total + shippingFeeFor(total),
    unavailable: lines.length - buyable.length,
  };
}
