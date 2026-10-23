// 못난이마켓 로고(시안 C · 단단한 간판): '이'의 ㅇ을 못난이 사과로 바꾼 글자 로고.
// 글자를 도형으로 바꾼 투명 배경 SVG라 글꼴 없이도 어디서나 선명해요. (검은고딕 Black Han Sans, OFL)
// 가로:세로 약 5.4:1 — 높이 기준으로 크기를 정해요.
// withMark: 헤더용. 글자 로고 앞에 배추 소녀·농부 마스코트 두 명을 나란히 붙여요.
import { SafeImage } from "./SafeImage";

export function BrandLogo({
  className = "",
  withMark = false,
}: {
  className?: string;
  withMark?: boolean;
}) {
  const wordmark = (
    <SafeImage
      src="/brand/motnani-logo.svg"
      alt="못난이마켓"
      priority
      className={`h-6 w-auto min-[360px]:h-7 sm:h-8 lg:h-10 ${className}`}
    />
  );
  if (!withMark) return wordmark;

  return (
    <span className="inline-flex items-center gap-2">
      {/* 마스코트는 꾸밈이라 화면 읽기에서는 건너뛰어요 (이름은 글자 로고가 읽혀요) */}
      <SafeImage
        src="/brand/motnani-mascot-pair.png"
        alt=""
        priority
        className="h-9 w-auto shrink-0 min-[360px]:h-10 sm:h-12 lg:h-14"
      />
      {wordmark}
    </span>
  );
}
