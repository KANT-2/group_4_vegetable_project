// 디자인 규칙 3번: 가상 데이터는 "가상"이라고 표시해요.
export default function MockDataNotice({ usingMock }: { usingMock: boolean }) {
  return (
    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-stone-600">
      농가 이름·가격·사진·별점·리뷰 수는 시연용 가상 데이터예요.
      {usingMock && " (DB 연결 전 Mock Data)"}
    </p>
  );
}
