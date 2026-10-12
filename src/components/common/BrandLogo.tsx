import { SafeImage } from "./SafeImage";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <SafeImage
      src="/brand/motnani-logo.png"
      alt="못난이마켓"
      priority
      className={`h-auto w-32 object-contain min-[360px]:w-40 sm:w-44 lg:w-56 ${className}`}
    />
  );
}
