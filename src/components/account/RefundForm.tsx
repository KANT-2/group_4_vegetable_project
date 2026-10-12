"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestRefund } from "@/actions/refund";
import { refundSchema } from "@/schemas/refund";

export function RefundForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      // 브라우저 기본 검사 대신 Zod 검사 결과를 안내 문구로 보여 줍니다.
      noValidate
      className="mt-6"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const parsed = refundSchema.safeParse({ order_id: orderId, reason });
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        setError("");
        startTransition(async () => {
          try {
            const result = await requestRefund(parsed.data);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          } catch {
            setError("신청하지 못했어요. 로그인 상태와 연결을 확인해 주세요.");
          }
        });
      }}
    >
      <label className="field-label" htmlFor="refund-reason">
        환불 사유
      </label>
      <textarea
        id="refund-reason"
        name="reason"
        className="field min-h-40"
        required
        minLength={10}
        maxLength={500}
        disabled={pending}
        value={reason}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby="refund-help refund-error"
        onChange={(event) => {
          setReason(event.target.value);
          setError("");
        }}
      />
      <p id="refund-help" className="mt-2 text-sm text-ink-muted">
        10~500자로 입력해 주세요. 카드번호·계좌번호 등 결제 정보는 적지 않아도
        돼요.
      </p>
      <p id="refund-error" role="alert" className="field-error">
        {error}
      </p>
      <p role="status" className="mt-4 text-ink-muted">
        {pending ? "환불 신청을 접수하고 있어요…" : ""}
      </p>
      <button
        className="btn btn-primary mt-4 w-full sm:w-auto"
        disabled={pending}
        type="submit"
      >
        {pending ? "접수 중…" : "환불 신청 접수"}
      </button>
    </form>
  );
}
