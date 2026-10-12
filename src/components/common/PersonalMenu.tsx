"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/actions/auth";
import { personalPages } from "@/lib/routes";
import { useNavigation } from "./NavigationProvider";
import { CartIcon } from "./Icons";

export function PersonalMenu({ expanded = false }: { expanded?: boolean }) {
  const { state, error, refresh, clear } = useNavigation();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div
      className={`flex items-center gap-2 text-sm ${expanded ? "flex-wrap" : ""}`}
    >
      <div
        aria-live="polite"
        className={expanded ? "block" : "hidden lg:block"}
      >
        {error ? (
          <button
            className="min-h-12 text-danger"
            onClick={() => void refresh()}
          >
            상태 확인 재시도
          </button>
        ) : !state ? (
          <span className="text-ink-muted">로그인 확인 중</span>
        ) : state.user ? (
          <span
            className="inline-block max-w-32 truncate font-bold"
            title={state.user.nickname}
          >
            {state.user.nickname}님
          </span>
        ) : (
          <span className="text-ink-muted">로그인 전</span>
        )}
      </div>
      {personalPages.cart ? (
        <Link
          href="/cart"
          className="relative inline-flex size-12 items-center justify-center rounded-full hover:bg-sand"
          aria-label={
            state ? `장바구니 ${state.cartCount}종` : "장바구니, 수 확인 중"
          }
        >
          <CartIcon width={24} height={24} />
          {state && state.cartCount > 0 && (
            <span className="absolute right-0 top-0 rounded-full bg-accent px-1.5 text-sm font-bold text-white">
              {state.cartCount}
            </span>
          )}
        </Link>
      ) : (
        <button
          disabled
          className="relative inline-flex size-12 items-center justify-center text-ink-muted"
          aria-label={
            state
              ? `장바구니 ${state.cartCount}종, 화면 준비 중`
              : "장바구니 준비 중"
          }
          title="장바구니 준비 중"
        >
          <CartIcon width={24} height={24} />
          {state && state.cartCount > 0 && (
            <span className="absolute right-0 top-0 rounded-full bg-accent px-1.5 text-sm font-bold text-white">
              {state.cartCount}
            </span>
          )}
        </button>
      )}
      <div className={expanded ? "block" : "hidden lg:block"}>
        {state?.user ? (
          <div>
            <button
              className="btn btn-secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setLogoutError("");
                  const result = await signOut(false);
                  if (!result.ok) {
                    setLogoutError(result.error);
                    return;
                  }
                  clear();
                  router.replace("/");
                  router.refresh();
                })
              }
            >
              {pending ? "로그아웃 중" : "로그아웃"}
            </button>
            {logoutError && (
              <p role="alert" className="field-error">
                {logoutError}
              </p>
            )}
          </div>
        ) : personalPages.login ? (
          <Link className="btn btn-secondary" href="/login">
            로그인
          </Link>
        ) : (
          <button className="btn btn-secondary" disabled>
            로그인 준비 중
          </button>
        )}
      </div>
    </div>
  );
}
