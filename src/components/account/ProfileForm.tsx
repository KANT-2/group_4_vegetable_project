"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/profile";
import { profileSchema } from "@/schemas/profile";
import { useNavigation } from "@/components/common/NavigationProvider";
import { ShippingAddressForm } from "./ShippingAddressForm";
import type { ShippingAddress } from "@/schemas/shipping";

export function ProfileForm({
  userId,
  email,
  initialNickname,
  initialShipping,
}: {
  userId: string;
  email: string;
  initialNickname: string;
  initialShipping: ShippingAddress;
}) {
  const router = useRouter();
  const { state, error: navigationError, refresh } = useNavigation();
  const [nickname, setNickname] = useState(initialNickname);
  const [savedNickname, setSavedNickname] = useState(initialNickname);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  // 계정 확인이 끝나기 전에는 이전 계정의 개인 정보를 보여주지 않습니다.
  if (!state && !navigationError)
    return <p role="status">계정을 확인하고 있어요.</p>;
  if (navigationError || state?.user?.id !== userId) {
    return (
      <div>
        <p role="alert" className="mb-4 text-danger">
          계정 확인이 필요해요. 페이지를 다시 불러와 주세요.
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            void refresh();
            router.refresh();
          }}
        >
          다시 불러오기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          setMessage("");
          const parsed = profileSchema.safeParse({ nickname });
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          setError("");
          startTransition(async () => {
            try {
              const result = await updateProfile(parsed.data, userId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setNickname(parsed.data.nickname);
              setSavedNickname(parsed.data.nickname);
              setMessage("닉네임을 저장했어요.");
              await refresh();
            } catch {
              setError(
                "저장하지 못했어요. 로그인 상태와 연결을 확인해 주세요.",
              );
            }
          });
        }}
      >
        <h2 className="mb-4 text-xl font-bold">회원 정보</h2>
        <dl className="mb-6">
          <dt className="font-bold">로그인 이메일</dt>
          <dd className="mt-1 break-all text-ink-muted">{email}</dd>
        </dl>
        <label htmlFor="nickname" className="field-label">
          닉네임
        </label>
        <input
          id="nickname"
          name="nickname"
          className="field"
          type="text"
          inputMode="text"
          autoComplete="nickname"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          minLength={2}
          maxLength={20}
          disabled={pending}
          value={nickname}
          aria-invalid={!!error}
          aria-describedby={
            error ? "nickname-help nickname-error" : "nickname-help"
          }
          onChange={(event) => {
            setNickname(event.target.value);
            setError("");
            setMessage("");
          }}
        />
        <p id="nickname-help" className="mt-2 text-sm text-ink-muted">
          2~20자로 입력해 주세요. 앞뒤 공백은 저장할 때 제거돼요.
        </p>
        {error && (
          <p id="nickname-error" role="alert" className="field-error">
            {error}
          </p>
        )}
        <p role="status" className="mt-4 min-h-7 text-brand">
          {pending ? "저장하고 있어요…" : message}
        </p>
        <button
          className="btn btn-primary mt-4 w-full sm:w-auto"
          type="submit"
          disabled={pending || nickname.trim() === savedNickname}
        >
          {pending ? "저장 중…" : "닉네임 저장"}
        </button>
      </form>
      <section
        className="border-t border-line pt-6"
        aria-labelledby="account-security"
      >
        <h2 id="account-security" className="text-xl font-bold">
          로그인·비밀번호
        </h2>
        <p className="mt-3 text-ink-muted">
          Google 계정으로 로그인하고 있어요. 비밀번호 변경과 계정 보안 설정은
          Google에서 관리할 수 있어요.
        </p>
        <a
          className="btn btn-secondary mt-4"
          href="https://myaccount.google.com/security"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google 계정 보안 관리 ↗
        </a>
      </section>
      <ShippingAddressForm userId={userId} initialAddress={initialShipping} />
    </div>
  );
}
