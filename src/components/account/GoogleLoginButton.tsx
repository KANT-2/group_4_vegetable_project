"use client";

import { useState, useTransition } from "react";
import { signInWithGoogle } from "@/actions/auth";

export function GoogleLoginButton({
  next,
  ready,
}: {
  next: string;
  ready: boolean;
  message: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={!ready || pending}
        className="btn btn-secondary w-full"
        onClick={() =>
          startTransition(async () => {
            setError("");
            const result = await signInWithGoogle(next);
            if (!result.ok) setError(result.error);
          })
        }
      >
        <span aria-hidden="true" className="mr-2 text-xl font-bold">
          G
        </span>
        {pending ? "Google로 이동 중" : "Google로 계속하기"}
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
