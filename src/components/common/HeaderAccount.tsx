"use client";

// 헤더 맨 윗줄의 작은 회원 메뉴 (v2 시안, 마켓컬리 기준)
// 로그인 전: 로그인(진하게) | 회원가입 / 로그인 후: 닉네임님 | 마이페이지 | 로그아웃
// 로그인 상태와 로그아웃은 C의 useNavigation·signOut 을 그대로 사용해요.

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { personalPages } from "@/lib/routes";
import { useNavigation } from "./NavigationProvider";

const item = "inline-flex min-h-9 items-center px-3 hover:text-brand";

export function HeaderAccount() {
  const { state, error, refresh } = useNavigation();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node))
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  if (error) {
    return (
      <button className={`${item} text-danger`} onClick={() => void refresh()}>
        상태 확인 재시도
      </button>
    );
  }
  if (!state) {
    return <span className={`${item} text-ink-muted`}>로그인 확인 중</span>;
  }

  if (!state.user) {
    return personalPages.login ? (
      <ul className="flex items-center divide-x divide-line">
        <li>
          <Link href="/login" className={`${item} font-bold text-brand`}>
            로그인
          </Link>
        </li>
        <li>
          <Link href="/login" className={item}>
            회원가입
          </Link>
        </li>
      </ul>
    ) : null;
  }

  return (
    <details
      ref={menu}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 font-bold [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand"
        >
          {state.user.nickname.slice(0, 1)}
        </span>
        <span className="max-w-28 truncate">{state.user.nickname}님</span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-72 max-h-[80dvh] overflow-y-auto rounded-xl border border-line bg-white text-sm shadow-lg">
        <div className="border-b border-line px-5 py-4">
          <p className="font-bold">{state.user.nickname}님</p>
          {state.user.email && (
            <p className="mt-1 truncate text-xs text-ink-muted">
              {state.user.email}
            </p>
          )}
        </div>
        <AccountMenu
          onNavigate={() => {
            if (menu.current) menu.current.open = false;
          }}
        />
      </div>
    </details>
  );
}
