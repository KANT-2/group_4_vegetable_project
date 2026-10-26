"use client";
export default function ProductError({ reset }: { reset: () => void }) {
  return (
    <section className="container-page py-16 text-center">
      <h1 className="text-2xl font-bold">상품을 불러오지 못했어요.</h1>
      <p className="mt-3 text-ink-muted">잠시 후 다시 시도해 주세요.</p>
      <button onClick={reset} className="btn btn-primary mt-6">
        다시 시도
      </button>
    </section>
  );
}
