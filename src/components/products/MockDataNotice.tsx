// 디자인 규칙 3번: 가상 데이터는 "가상"이라고 표시해요.
export default function MockDataNotice({ usingMock }: { usingMock: boolean }) {
  return (
    <p className="rounded-xl border border-dashed border-bark/40 bg-accent-soft px-3 py-2 text-xs text-bark">
      농가 이름·가격·사진·별점·리뷰 수는 시연용 가상 데이터예요.
      {usingMock && " (DB 연결 전 Mock Data)"}
    </p>
  );
}
