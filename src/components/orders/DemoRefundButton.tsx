"use client";

import { useState } from "react";

export function DemoRefundButton({ orderId }: { orderId: string }) {
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const key = `motnani-refund:customer-demo-qwer:${orderId}`;
  return <section className="mt-6 border-t border-line pt-5">
    <h3 className="mb-3 text-sm font-bold">환불 신청</h3>
    {saved ? <p role="status" className="rounded-control bg-brand-soft p-4 text-sm text-brand-dark">환불 신청이 되었습니다</p> : editing ? <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (reason.trim().length < 5) { setError("환불 사유를 5자 이상 입력해 주세요."); return; }
      try {
        localStorage.setItem(key, JSON.stringify({ orderId, reason: reason.trim(), status: "requested", createdAt: new Date().toISOString() }));
        setSaved(true); setError("");
      } catch { setError("신청 내용을 저장하지 못했어요."); }
    }}>
      <label className="block text-sm font-semibold">환불 사유<textarea required minLength={5} maxLength={1000} rows={4} className="field mt-2 w-full font-normal" placeholder="상품 상태와 환불을 원하시는 이유를 적어 주세요." value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>취소</button><button className="btn btn-primary" type="submit">환불 신청하기</button></div>
    </form> : <button type="button" className="btn btn-secondary" onClick={() => {
      try { if (localStorage.getItem(key)) { setSaved(true); return; } } catch { /* 저장이 불가능하면 제출 시 안내합니다. */ }
      setEditing(true);
    }}>환불 신청</button>}
  </section>;
}
