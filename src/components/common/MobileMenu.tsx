"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "./Icons";
import { PersonalMenu } from "./PersonalMenu";

export interface NavLink {
  href: string;
  label: string;
}

export function MobileMenu({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef<string | null>(null);

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      if (previousOverflow.current !== null)
        document.body.style.overflow = previousOverflow.current;
    };
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-12 items-center justify-center rounded-full hover:bg-sand"
        aria-label="메뉴 열기"
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        onClick={() => {
          dialogRef.current?.showModal();
          previousOverflow.current = document.body.style.overflow;
          document.body.style.overflow = "hidden";
          setOpen(true);
        }}
      >
        <MenuIcon width={24} height={24} />
      </button>
      <dialog
        ref={dialogRef}
        id="mobile-menu-panel"
        aria-labelledby="mobile-menu-title"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-sm overflow-y-auto border-0 bg-surface p-6 text-ink backdrop:bg-ink/40"
        onClick={(event) => {
          if (
            event.target === event.currentTarget &&
            event.clientX < event.currentTarget.getBoundingClientRect().left
          )
            close();
        }}
        onClose={() => {
          setOpen(false);
          if (previousOverflow.current !== null)
            document.body.style.overflow = previousOverflow.current;
          previousOverflow.current = null;
          buttonRef.current?.focus();
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2
            id="mobile-menu-title"
            className="text-xl font-extrabold text-brand-dark"
          >
            메뉴
          </h2>
          <button
            autoFocus
            type="button"
            className="inline-flex size-12 items-center justify-center rounded-full hover:bg-sand"
            aria-label="메뉴 닫기"
            onClick={close}
          >
            <CloseIcon width={24} height={24} />
          </button>
        </div>
        <nav aria-label="모바일 메뉴" className="mt-6">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  aria-current={
                    link.href === "/"
                      ? pathname === "/"
                        ? "page"
                        : undefined
                      : pathname === link.href ||
                          pathname.startsWith(`${link.href}/`)
                        ? "page"
                        : undefined
                  }
                  className="flex min-h-12 items-center rounded-control px-3 font-bold hover:bg-sand aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6 border-t border-line pt-6">
          <PersonalMenu expanded />
        </div>
      </dialog>
    </div>
  );
}
