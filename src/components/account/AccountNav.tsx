import Link from "next/link";

export function AccountNav({ active }: { active: "profile" | "orders" }) {
  return (
    <nav aria-label="마이페이지 메뉴" className="mb-6 flex flex-wrap gap-3">
      <Link
        href="/mypage"
        className={
          active === "profile" ? "btn btn-primary" : "btn btn-secondary"
        }
        aria-current={active === "profile" ? "page" : undefined}
      >
        회원 정보·배송지
      </Link>
      <Link
        href="/mypage/orders"
        className={
          active === "orders" ? "btn btn-primary" : "btn btn-secondary"
        }
        aria-current={active === "orders" ? "page" : undefined}
      >
        주문내역·환불
      </Link>
    </nav>
  );
}
