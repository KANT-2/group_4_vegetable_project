import Link from "next/link";
import { COLLECTIONS, type CollectionKey } from "@/lib/catalog";

// 상품 화면 맨 위 코너 고르기: 아이콘 + 짧은 이름 5칸
export default function CollectionNav({ active }: { active?: CollectionKey }) {
  const items = [
    { key: "all", href: "/products", emoji: "🥕", label: "전체" },
    ...(Object.keys(COLLECTIONS) as CollectionKey[]).map((key) => ({
      key,
      href: `/products?collection=${key}`,
      emoji: COLLECTIONS[key].emoji,
      label: COLLECTIONS[key].short,
    })),
  ];

  return (
    <nav aria-label="상품 코너">
      <ul className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const isActive = (active ?? "all") === item.key;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="group flex min-h-12 flex-col items-center gap-1 rounded-card py-1"
              >
                <span
                  aria-hidden
                  className={
                    "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition sm:h-14 sm:w-14 " +
                    (isActive
                      ? "bg-brand-soft ring-2 ring-brand"
                      : "bg-surface ring-1 ring-line group-hover:bg-brand-soft")
                  }
                >
                  {item.emoji}
                </span>
                <span
                  className={
                    "whitespace-nowrap text-xs sm:text-sm " +
                    (isActive ? "font-bold text-brand-dark" : "text-ink-muted")
                  }
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
