"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { updateCustomerDemo } from "@/actions/customer-demo";
import type { CustomerDemoProfile } from "@/lib/customer-demo-session";
import { useNavigation } from "@/components/common/NavigationProvider";
import { AddressSearchButton } from "./AddressSearchButton";
import { SaveProfileDialog } from "./SaveProfileDialog";
import { PasswordChangeForm } from "./PasswordChangeForm";

export function CustomerDemoMyPage({
  profile,
}: {
  profile: CustomerDemoProfile;
}) {
  const { refresh } = useNavigation();
  const router = useRouter();
  const [postalCode, setPostalCode] = useState(profile.postalCode);
  const [address, setAddress] = useState(profile.address);
  const detail = useRef<HTMLInputElement>(null);
  const draft = useRef<FormData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: { error: string; success: string }, form: FormData) => {
      const result = await updateCustomerDemo(previous, form);
      if (result.success) {
        await refresh();
        router.refresh();
      }
      return result;
    },
    { error: "", success: "" },
  );
  const field =
    "mt-2 min-h-12 w-full rounded-control border border-line bg-white px-4 font-normal";
  useEffect(() => {
    if (state.success)
      document
        .getElementById("account-profile-notice")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state]);
  const noticeHost = state.success
    ? document.getElementById("account-profile-notice")
    : null;
  return (
    <div className="space-y-6">
      <form
        action={action}
        className="space-y-6 rounded-xl border border-line bg-white p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || confirming) return;
          draft.current = new FormData(event.currentTarget);
          setConfirming(true);
        }}
      >
        {state.success &&
          noticeHost &&
          createPortal(
            <p
              role="status"
              className="mb-6 rounded-control bg-green-50 p-4 text-sm text-green-800"
            >
              {state.success}
            </p>,
            noticeHost,
          )}
        <div className="relative grid items-start gap-8 xl:grid-cols-2 xl:gap-x-16 xl:before:pointer-events-none xl:before:absolute xl:before:bottom-0 xl:before:left-1/2 xl:before:top-0 xl:before:w-px xl:before:-translate-x-1/2 xl:before:scale-x-50 xl:before:bg-line/70">
          <section className="min-w-0">
            <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-xl font-bold">회원 정보</h2>
              <span className="text-xs text-ink-muted">
                <span className="text-brand">*</span> 필수 입력
              </span>
            </div>
            <div className="grid gap-6">
              <label className="block text-sm font-bold">
                아이디
                <input
                  readOnly
                  value="qwer"
                  className={`${field} bg-sand text-ink-muted`}
                />
                <span className="mt-2 block text-xs font-normal text-ink-muted">
                  아이디는 변경할 수 없어요.
                </span>
              </label>
              <label className="block text-sm font-bold">
                이름 <span className="text-brand">*</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  maxLength={60}
                  defaultValue={profile.name}
                  placeholder="실명을 입력해 주세요"
                  className={field}
                />
              </label>
              <label className="block text-sm font-bold">
                이메일 <span className="text-brand">*</span>
                <input
                  name="email"
                  required
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  defaultValue={profile.email}
                  placeholder="example@email.com"
                  className={field}
                />
              </label>
              <label className="block text-sm font-bold">
                휴대폰 번호 <span className="text-brand">*</span>
                <input
                  name="phone"
                  required
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  defaultValue={profile.phone}
                  placeholder="010-0000-0000"
                  className={field}
                />
              </label>
            </div>
          </section>
          <section className="min-w-0">
            <div className="mb-6 flex min-h-11 items-start border-b border-line pb-4">
              <h2 className="text-xl font-bold">기본 배송지</h2>
            </div>
            <div className="space-y-5">
              <label className="block text-sm font-bold">
                받는 분
                <input
                  name="recipient"
                  maxLength={60}
                  defaultValue={profile.recipient}
                  className={field}
                  placeholder="받는 분 이름"
                />
              </label>
              <label className="block text-sm font-bold">
                배송지 연락처
                <input
                  name="recipientPhone"
                  type="tel"
                  autoComplete="shipping tel"
                  maxLength={20}
                  defaultValue={profile.recipientPhone ?? profile.phone}
                  placeholder="010-0000-0000"
                  className={field}
                />
              </label>
              <div>
                <label
                  htmlFor="customer-postal-code"
                  className="block text-sm font-bold"
                >
                  주소
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    id="customer-postal-code"
                    name="postalCode"
                    aria-label="우편번호"
                    inputMode="numeric"
                    autoComplete="shipping postal-code"
                    maxLength={5}
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    placeholder="우편번호"
                    className="min-h-12 w-36 rounded-control border border-line bg-white px-4"
                  />
                  <AddressSearchButton
                    onSelect={(code, selectedAddress) => {
                      setPostalCode(code);
                      setAddress(selectedAddress);
                      if (detail.current) detail.current.value = "";
                      detail.current?.focus();
                    }}
                  />
                </div>
              </div>
              <label className="block text-sm font-bold">
                기본 주소
                <input
                  name="address"
                  autoComplete="address-line1"
                  maxLength={200}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="주소 검색으로 기본 주소를 선택해 주세요"
                  className={field}
                />
              </label>
              <label className="block text-sm font-bold">
                상세 주소
                <input
                  name="addressDetail"
                  ref={detail}
                  autoComplete="address-line2"
                  maxLength={100}
                  defaultValue={profile.addressDetail}
                  placeholder="동·호수 등 상세 주소 입력"
                  className={field}
                />
              </label>
            </div>
          </section>
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <div className="flex justify-center border-t border-line pt-6">
          <button disabled={pending} className="btn btn-primary w-full sm:w-56">
            {pending ? "저장 중…" : "저장"}
          </button>
        </div>
        {confirming && (
          <SaveProfileDialog
            onResult={(confirmed) => {
              setConfirming(false);
              const form = draft.current;
              draft.current = null;
              if (confirmed && form) startTransition(() => action(form));
            }}
          />
        )}
      </form>
      <PasswordChangeForm googleOnly={false} />
    </div>
  );
}
