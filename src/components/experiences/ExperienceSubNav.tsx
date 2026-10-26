"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./useAuth";

export function ExperienceSubNav() {
  const pathname = usePathname();
  const { auth } = useAuth();
  const items = [
    {
      href: "/experiences",
      label: "체험 둘러보기",
      match: (p: string) =>
        p === "/experiences" ||
        /^\/experiences\/(?!reservations|admin)/.test(p),
    },
    {
      href: "/experiences/reservations",
      label: "내 예약",
      match: (p: string) => p.startsWith("/experiences/reservations"),
    },
    ...(auth?.role === "admin"
      ? [
          {
            href: "/experiences/admin",
            label: "예약 운영(관리자)",
            match: (p: string) => p.startsWith("/experiences/admin"),
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="체험 예약 메뉴"
      className="mb-6 flex gap-1 border-b border-line"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.match(pathname) ? "page" : undefined}
          className="inline-flex min-h-11 items-center border-b-[3px] border-transparent px-4 text-[0.9375rem] font-medium text-ink-muted aria-[current=page]:border-brand aria-[current=page]:font-bold aria-[current=page]:text-brand"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
