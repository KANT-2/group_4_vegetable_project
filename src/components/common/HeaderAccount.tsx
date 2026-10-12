"use client";

// 헤더 맨 윗줄의 작은 회원 메뉴 (v2 시안, 마켓컬리 기준)
// 로그인 전: 회원가입 | 로그인 / 로그인 후: 닉네임님 | 마이페이지 | 로그아웃
// 로그인 상태와 로그아웃은 C의 useNavigation·signOut 을 그대로 사용해요.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signOut } from "@/actions/auth";
import { personalPages } from "@/lib/routes";
import { useNavigation } from "./NavigationProvider";

const item = "inline-flex min-h-9 items-center px-3 hover:text-brand";

export function HeaderAccount() {
  const { state, error, refresh, clear } = useNavigation();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  const [pending, startTransition] = useTransition();

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
            회원가입
          </Link>
        </li>
        <li>
          <Link href="/login" className={item}>
            로그인
          </Link>
        </li>
      </ul>
    ) : null;
  }

  return (
    <ul className="flex items-center divide-x divide-line" aria-live="polite">
      <li>
        <span
          className={`${item} max-w-40 truncate font-bold`}
          title={state.user.nickname}
        >
          {state.user.nickname}님
        </span>
      </li>
      {personalPages.mypage && (
        <li>
          <Link href="/mypage" className={item}>
            마이페이지
          </Link>
        </li>
      )}
      <li>
        <button
          className={item}
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
      </li>
    </ul>
  );
}
