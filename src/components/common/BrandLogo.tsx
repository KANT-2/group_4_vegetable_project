// 못난이마켓 로고: 새싹이 올라간 둥근 글자 로고 (관리자 화면과 같은 이미지).
// 투명 배경 PNG, 가로:세로 약 2.4:1 — 높이 기준으로 크기를 정해요.
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
      src="/brand/motnani-admin-wordmark.png"
      alt="못난이마켓"
      priority
      className={`h-9 w-auto min-[360px]:h-10 sm:h-11 lg:h-12 ${className}`}
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
