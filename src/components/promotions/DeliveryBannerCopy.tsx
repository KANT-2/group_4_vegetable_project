type Props = { eyebrow: string; title: string; sub?: string; cta?: string };

// 홈과 상세에서 같은 문구·레이아웃을 사용하고 기존 사진은 유지합니다.
export function DeliveryBannerCopy({ eyebrow, title, sub, cta }: Props) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#163728]/95 via-[#163728]/65 to-transparent sm:bg-[linear-gradient(90deg,#1b3c2b_0%,#1b3c2b_50%,transparent_65%)]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 flex w-full flex-col justify-center px-6 text-[#fffbe6] sm:w-[56%] sm:px-[5.5vw]"
      >
        <span className="flex items-center gap-3 text-[.6875rem] font-medium tracking-[.2em] text-[#fffbe6]/75 sm:text-[clamp(.625rem,.9vw,1rem)]">
          <span className="h-px w-6 bg-[#fffbe6]/50" />
          {eyebrow}
        </span>
        <span className="mt-4 text-[1.875rem] font-semibold leading-[1.2] tracking-[-.04em] sm:mt-[1.3vw] sm:text-[clamp(1.35rem,3.6vw,4.25rem)]">
          {title.split("\n").map((line, index) => (
            <span
              key={line}
              className={`block ${index > 0 ? "font-bold" : ""}`}
            >
              {line}
            </span>
          ))}
        </span>
        {sub && (
          <span className="mt-3 max-w-[30ch] text-xs leading-relaxed text-[#fffbe6]/80 sm:mt-[1.2vw] sm:text-[clamp(.65rem,1.1vw,1.2rem)]">
            {sub}
          </span>
        )}
        <span className="mt-5 inline-flex w-fit items-center gap-3 border-b border-[#fffbe6]/45 pb-1 text-xs font-medium sm:mt-[1.8vw] sm:text-[clamp(.65rem,1vw,1.1rem)]">
          {cta}
          <span className="text-base">↗</span>
        </span>
      </span>
    </>
  );
}
