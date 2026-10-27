"use client";

// 헤더 메뉴 (v2 시안, 마켓컬리 기준)
// desktop: 아이콘 + 이름을 넓게 펼친 한 줄 / mobile: 옆으로 넘기는 탭 줄
// 지금 보고 있는 메뉴에 aria-current 를 표시해요. 상품 목록은 고른 조건과 상관없이 "전체 상품"이 선택돼요.

import Link from "next/link";
import ScrollRow from "@/components/products/ScrollRow";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import type { NavIconName, NavLink } from "./MobileMenu";
import {
  BarnIcon,
  CalendarSproutIcon,
  ChefHatIcon,
  GiftIcon,
  MenuIcon,
} from "./Icons";

const NAV_ICONS: Record<NavIconName, ComponentType<SVGProps<SVGSVGElement>>> = {
  menu: MenuIcon,
  recipe: ChefHatIcon,
  farm: BarnIcon,
  experience: CalendarSproutIcon,
  gift: GiftIcon,
};

function isActive(pathname: string, href: string) {
  const [path] = href.split("?");
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavIcon({ name, size }: { name?: NavIconName; size: number }) {
  if (!name) return null;
  const Icon = NAV_ICONS[name];
  return <Icon width={size} height={size} className="shrink-0 text-brand" />;
}

export function NavLinks({
  links,
  variant = "desktop",
}: {
  links: NavLink[];
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();

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
                    isActive(pathname, link.href) ? "page" : undefined
                  }
                  className="inline-flex min-h-12 items-center gap-1.5 border-b-[3px] border-transparent px-3 text-[0.9375rem] font-medium text-ink-muted aria-[current=page]:border-brand aria-[current=page]:font-bold aria-[current=page]:text-brand"
                >
                  <NavIcon name={link.icon} size={18} />
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
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className="inline-flex min-h-14 items-center gap-2 px-2 font-medium text-ink hover:text-brand aria-[current=page]:font-bold aria-[current=page]:text-brand"
            >
              <NavIcon name={link.icon} size={22} />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
