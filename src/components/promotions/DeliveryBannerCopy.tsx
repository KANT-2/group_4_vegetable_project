import Image from "next/image";

type Props = {
  eyebrow: string;
  title: string;
  sub?: string;
  cta?: string;
  compact?: boolean;
};

// 홈과 상세에서 같은 문구·레이아웃을 사용하고 기존 사진은 유지합니다.
export function DeliveryBannerCopy({
  eyebrow,
  title,
  sub,
  cta,
  compact = false,
}: Props) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[65%] [mask-image:linear-gradient(to_right,#000_0%,#000_80%,transparent_100%)] ${compact ? "block" : "hidden sm:block"}`}
      >
        <Image
          src="/images/farms/youngju-orchard.webp"
          alt=""
          fill
          sizes={compact ? "350px" : "65vw"}
          className="object-cover"
        />
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,23,16,.65)_0%,rgba(10,23,16,.55)_40%,rgba(10,23,16,.16)_65%,transparent_85%)]"
      />
      <span
        aria-hidden="true"
        className={
          compact
            ? "absolute inset-y-0 left-0 flex w-[65%] flex-col justify-center px-4 text-[#fffbe6]"
            : "absolute inset-y-0 left-0 flex w-full flex-col justify-center px-6 text-[#fffbe6] sm:w-[56%] sm:px-[5.5vw]"
        }
      >
        <span
          className={
            compact
              ? "text-[9px] font-medium tracking-wide text-[#fffbe6]/85"
              : "flex items-center gap-3 text-xs font-medium tracking-[.15em] text-[#fffbe6]/85 sm:text-[clamp(.7rem,1vw,1.125rem)]"
          }
        >
          {!compact && <span className="h-px w-6 bg-[#fffbe6]/50" />}
          {eyebrow}
        </span>
        <span
          className={
            compact
              ? "mt-1 text-[clamp(.875rem,1.4vw,1.25rem)] font-semibold leading-tight tracking-[-.03em]"
              : "mt-4 text-[1.875rem] font-semibold leading-[1.2] tracking-[-.04em] sm:mt-[1.3vw] sm:text-[clamp(1.35rem,4vw,4.5rem)]"
          }
        >
          {title.split("\n").map((line, index) => (
            <span
              key={line}
              className={`block ${index > 0 ? "font-bold" : ""}`}
            >
              {line}
            </span>
          ))}
        </span>
        {sub && !compact && (
          <span className="mt-3 max-w-[30ch] text-xs leading-relaxed text-[#fffbe6]/80 sm:mt-[1.2vw] sm:text-[clamp(.65rem,1.1vw,1.2rem)]">
            {sub}
          </span>
        )}
        <span
          className={
            compact
              ? "mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#fffbe6] px-2 py-1 text-[8px] font-bold text-[#203e2b]"
              : "mt-5 inline-flex w-fit items-center gap-4 rounded-full bg-[#fffbe6] px-5 py-2.5 text-sm font-semibold text-[#203e2b] sm:mt-[1.8vw] sm:px-[1.8vw] sm:py-[.8vw] sm:text-[clamp(.7rem,1.15vw,1.2rem)]"
          }
        >
          {cta}
          <span>→</span>
        </span>
      </span>
    </>
  );
}
