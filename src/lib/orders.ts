export const orderStatusLabels: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  payment_failed: "결제 실패",
  cancelled: "주문 취소",
};
export const refundStatusLabels: Record<string, string> = {
  requested: "환불 신청 접수",
  approved: "환불 신청 승인",
  rejected: "환불 신청 반려",
};
export function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
