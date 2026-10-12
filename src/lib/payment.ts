export const paymentMethods = {
  card: "신용·체크카드",
  bank_transfer: "계좌이체",
  easy_pay: "간편결제",
} as const;

export type PaymentMethod = keyof typeof paymentMethods;
