// 회의 시연용 가상 주문입니다. 실제 주문 데이터베이스에는 저장하지 않습니다.
const samples = [
  { day: "25", time: "10:32", name: "해남 겨울배추", unit: "1통", price: 2500, quantity: 2, method: "card" },
  { day: "23", time: "14:18", name: "제주 월동무", unit: "1개", price: 1300, quantity: 3, method: "easy_pay" },
  { day: "20", time: "09:45", name: "제주 브로콜리 실속", unit: "2송이", price: 2900, quantity: 2, method: "bank_transfer" },
  { day: "17", time: "18:06", name: "청양 새송이버섯", unit: "1kg", price: 4500, quantity: 1, method: "card" },
  { day: "12", time: "11:21", name: "청송 가정용 사과", unit: "2kg", price: 12900, quantity: 2, method: "easy_pay" },
];

export const customerDemoOrders = samples.map((sample, index) => ({
  id: `DEMO-202610${sample.day}-${String(index + 1).padStart(4, "0")}`,
  status: "paid",
  created_at: `2026-10-${sample.day}T${sample.time}:00+09:00`,
  paid_at: `2026-10-${sample.day}T${sample.time}:30+09:00`,
  payment_method: sample.method,
  recipient_name: "홍길동",
  recipient_phone: "010-0000-0000",
  postal_code: "04524",
  address: "서울특별시 중구 세종대로 110",
  address_detail: "가상 배송지 101호",
  shipping_fee: sample.price * sample.quantity >= 20000 ? 0 : 3000,
  total_amount: sample.price * sample.quantity + (sample.price * sample.quantity >= 20000 ? 0 : 3000),
  order_items: [{
    product_id: `demo-product-${index + 1}`,
    product_name: sample.name,
    product_unit: sample.unit,
    quantity: sample.quantity,
    unit_price: sample.price,
  }],
  refund_requests: null,
}));

export const customerDemoRefundOrders = Array.from({ length: 8 }, (_, index) => {
  const original = customerDemoOrders[index % customerDemoOrders.length];
  const day = String(24 - index).padStart(2, "0");
  const cancelled = index % 3 === 0;
  return {
    ...original,
    id: `DEMO-REFUND-202610${day}-${String(index + 1).padStart(4, "0")}`,
    created_at: `2026-10-${day}T10:30:00+09:00`,
    paid_at: `2026-10-${day}T10:30:30+09:00`,
    status: cancelled ? "cancelled" : "paid",
    refund_requests: cancelled ? null : { status: index % 3 === 1 ? "requested" : "approved" },
  };
});
