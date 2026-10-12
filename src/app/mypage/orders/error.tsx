"use client";

export default function OrdersError({ reset }: { reset: () => void }) {
  return (
    <section className="container-page section">
      <div className="card p-6">
        <h1 className="page-title">주문 정보를 불러오지 못했어요</h1>
        <p className="mt-3 text-ink-muted">잠시 후 다시 시도해 주세요.</p>
        <button className="btn btn-secondary mt-6" onClick={reset}>
          다시 불러오기
        </button>
      </div>
    </section>
  );
}
