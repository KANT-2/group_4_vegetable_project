// 기존 배너 사진은 유지하고 이미지에 박힌 이전 문구만 HTML로 교체합니다.
export function DeliveryBannerCopy() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-transparent sm:bg-[linear-gradient(90deg,#1b3c2b_0%,#1b3c2b_50%,transparent_64%)]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 flex w-full flex-col justify-center px-5 text-[#fffbe6] sm:w-[56%] sm:px-[5.5vw]"
      >
        <span className="text-sm font-medium tracking-widest sm:text-[clamp(.75rem,1.3vw,1.5rem)]">
          신선 배송
        </span>
        <span className="mt-3 whitespace-pre-line text-[1.75rem] leading-tight tracking-tight sm:text-[clamp(1.25rem,3.2vw,3.75rem)]">
          <span>15시 전에 주문하면</span>
          <br />
          <strong className="font-bold">오늘 자정 전 도착!</strong>
        </span>
        <span className="mt-5 inline-flex w-fit rounded-full bg-[#fffbe6] px-4 py-2 text-xs font-bold text-[#1b3c2b] sm:mt-[2vw] sm:text-[clamp(.7rem,1.2vw,1.25rem)]">
          대상 지역 확인하러 가기 (수도권) →
        </span>
      </span>
    </>
  );
}
