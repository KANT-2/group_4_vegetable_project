"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ProfileRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <p role="alert" className="mb-4 text-danger">
        프로필을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
      <button
        className="btn btn-secondary"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? "불러오는 중…" : "다시 불러오기"}
      </button>
    </div>
  );
}
