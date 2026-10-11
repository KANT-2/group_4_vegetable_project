"use client";

// 모바일 메뉴 (헤더 오른쪽 버튼 → 아래로 펼쳐지는 링크 목록)
// 열기·닫기 버튼, Esc 로 닫기, 링크를 누르거나 페이지가 바뀌면 자동으로 닫혀요.
// (공통 헤더·메뉴의 최종 담당은 C예요. C가 개인 메뉴를 붙일 수 있게 링크 목록만 받도록 만들었어요.)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "./Icons";

export interface NavLink {
  href: string;
  label: string;
}

export function MobileMenu({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 다른 페이지로 이동하면 메뉴를 닫아요.
  const isOpen = open && openedAt === pathname;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-12 items-center justify-center rounded-full hover:bg-sand"
        aria-expanded={isOpen}
        aria-controls="mobile-menu-panel"
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(!isOpen);
        }}
      >
        {isOpen ? (
          <CloseIcon width={24} height={24} />
        ) : (
          <MenuIcon width={24} height={24} />
        )}
        <span className="sr-only">{isOpen ? "메뉴 닫기" : "메뉴 열기"}</span>
      </button>

      {isOpen && (
        <nav
          id="mobile-menu-panel"
          aria-label="모바일 메뉴"
          className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-card"
        >
          <ul className="container-page py-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="flex min-h-12 items-center rounded-xl px-3 font-bold hover:bg-sand aria-[current=page]:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
