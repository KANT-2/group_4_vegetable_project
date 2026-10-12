"use client";

import { useRouter } from "next/navigation";
import { useNavigation } from "@/components/common/NavigationProvider";

export function AccountGuard({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const { state, error, refresh } = useNavigation();
  const router = useRouter();
  if (!state && !error) return <p role="status">계정을 확인하고 있어요.</p>;
  if (error || state?.user?.id !== userId)
    return (
      <div className="card p-6">
        <p role="alert">계정 확인이 필요해요. 페이지를 다시 불러와 주세요.</p>
        <button
          className="btn btn-secondary mt-4"
          onClick={() => {
            void refresh();
            router.refresh();
          }}
        >
          다시 불러오기
        </button>
      </div>
    );
  return children;
}
