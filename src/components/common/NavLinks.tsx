"use client";

// 헤더 메뉴 (v2 시안, 마켓컬리 기준)
// desktop: "카테고리" 옆에 넓게 펼친 한 줄 / mobile: 옆으로 넘기는 탭 줄
// 지금 보고 있는 메뉴에 aria-current 를 표시해요. ?collection= 같은 주소 조건까지 비교해요.

import Link from "next/link";
import ScrollRow from "@/components/products/ScrollRow";
import { usePathname, useSearchParams } from "next/navigation";
import type { NavLink } from "./MobileMenu";

function isActive(pathname: string, search: URLSearchParams, href: string) {
  const [path, query] = href.split("?");
  if (path === "/") return pathname === "/";
  const samePath = pathname === path || pathname.startsWith(`${path}/`);
  if (!samePath) return false;
  const collection = new URLSearchParams(query ?? "").get("collection");
  // /products 는 기획전(collection)이 없을 때만 "전체 상품"이 선택돼요.
  return collection
    ? search.get("collection") === collection
    : !search.get("collection") || path !== "/products";
}

export function NavLinks({
  links,
  variant = "desktop",
}: {
  links: NavLink[];
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const search = useSearchParams();

  if (variant === "mobile") {
    return (
      <nav aria-label="주요 메뉴" className="lg:hidden">
        <ScrollRow label="메뉴" className="px-2">
          <ul className="flex w-max shrink-0">
            {links.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={
                    isActive(pathname, search, link.href) ? "page" : undefined
                  }
                  className="inline-flex min-h-12 items-center border-b-[3px] border-transparent px-3 text-[0.9375rem] font-medium text-ink-muted aria-[current=page]:border-brand aria-[current=page]:font-bold aria-[current=page]:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </ScrollRow>
      </nav>
    );
  }

  return (
    <nav aria-label="주요 메뉴" className="min-w-0 flex-1">
      <ul className="flex items-center justify-around">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={
                isActive(pathname, search, link.href) ? "page" : undefined
              }
              className="inline-flex min-h-14 items-center px-2 font-medium text-ink hover:text-brand aria-[current=page]:font-bold aria-[current=page]:text-brand"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
