import Link from "next/link";

export default function OrderNotFound() {
  return (
    <section className="container-page section">
      <div className="card p-6">
        <h1 className="page-title">주문을 찾을 수 없어요</h1>
        <p className="mt-3 text-ink-muted">
          본인 주문인지 주문번호를 확인해 주세요.
        </p>
        <Link className="btn btn-primary mt-6" href="/mypage/orders">
          내 주문내역 보기
        </Link>
      </div>
    </section>
  );
}
