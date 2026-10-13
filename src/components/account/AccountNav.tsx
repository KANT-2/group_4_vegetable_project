import Link from "next/link";
import { ArrowRightIcon } from "@/components/common/Icons";

export function AccountNav({
  active,
  sidebar = false,
}: {
  active: "profile" | "orders";
  sidebar?: boolean;
}) {
  const items = [
    { key: "orders", href: "/mypage/orders", title: "주문내역·환불" },
    { key: "profile", href: "/mypage", title: "회원 정보·배송지" },
  ];
  return (
    <nav
      aria-label="마이페이지 메뉴"
      className={
        sidebar
          ? "overflow-hidden rounded-xl border border-line/60 bg-surface"
          : "mb-6 border-b border-line"
      }
    >
      {sidebar && (
        <p className="hidden px-5 pb-2 pt-5 text-xs font-semibold text-ink-muted lg:block">
          나의 쇼핑
        </p>
      )}
      <div className={sidebar ? "grid grid-cols-2 lg:block" : "flex flex-wrap"}>
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? "page" : undefined}
            className={`flex min-h-14 items-center justify-between gap-2 px-4 py-4 text-sm transition-colors lg:px-5 ${active === item.key ? "bg-brand-soft font-bold text-brand-dark" : "text-ink hover:bg-sand"}`}
          >
            {item.title}
            <ArrowRightIcon
              width={16}
              height={16}
              className="hidden lg:block"
            />
          </Link>
        ))}
        {sidebar && (
          <Link
            href="/cart"
            className="hidden min-h-14 items-center justify-between px-5 py-4 text-sm hover:bg-sand lg:flex"
          >
            장바구니·찜 <ArrowRightIcon width={16} height={16} />
          </Link>
        )}
      </div>
    </nav>
  );
}
