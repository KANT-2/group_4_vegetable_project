import Link from "next/link";

// 없는 상품 주소로 들어왔을 때
export default function ProductNotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-xl font-bold text-ink">상품을 찾을 수 없어요</h1>
      <p className="text-sm text-ink-muted">
        판매가 끝났거나 주소가 잘못되었어요.
      </p>
      <Link href="/products" className="mt-2 btn btn-primary">
        상품 목록으로
      </Link>
    </div>
  );
}
