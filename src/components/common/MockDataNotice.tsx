// Mock(개발용 예시) 데이터로 화면을 그리고 있을 때만 보이는 안내
// 실제 DB 데이터로 실행 중이면 아무것도 그리지 않아요.

import { getDataSource } from "@/lib/data-source";

export function MockDataNotice({ subject }: { subject: string }) {
  if (getDataSource() !== "mock") return null;
  return (
    <p
      className="rounded-xl border border-dashed border-bark/40 bg-accent-soft px-3 py-2 text-sm text-bark"
      data-testid="mock-notice"
    >
      <strong>개발용 예시 데이터</strong> — 실제 정보가 아닌 시연용 가상
      정보예요 ({subject})
    </p>
  );
}
