export interface NavigationState {
  user: { id: string; nickname: string } | null;
  cartCount: number; // 장바구니 상품 수량의 합계
}
