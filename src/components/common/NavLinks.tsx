"use client";

// 넓은 화면(768px 이상)의 헤더 메뉴. 지금 보고 있는 메뉴에 밑줄과 aria-current 를 표시해요.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "./MobileMenu";

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="hidden md:block">
      <ul className="flex items-center gap-2">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="inline-flex min-h-12 items-center border-b-2 border-transparent px-3 font-bold hover:text-brand aria-[current=page]:border-brand aria-[current=page]:text-brand"
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
