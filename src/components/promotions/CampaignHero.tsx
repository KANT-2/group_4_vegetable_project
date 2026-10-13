import Image from "next/image";
import { DeliveryBannerCopy } from "./DeliveryBannerCopy";
import Link from "next/link";
import type { homeCampaigns } from "@/data/home-campaigns";

// 홈과 같은 이미지·비율·모바일 크롭을 유지하는 정지 배너입니다.
export function CampaignHero({
  campaign,
}: {
  campaign: (typeof homeCampaigns)[number];
}) {
  return (
    <section
      aria-label={`${campaign.eyebrow} 행사 배너`}
      className="relative h-72 w-full overflow-hidden bg-sand sm:aspect-[3/1] sm:h-auto"
    >
      <Link
        href="#benefit"
        aria-label={`${campaign.eyebrow}: ${campaign.title}. 혜택 및 안내 보기`}
        className="relative block size-full"
      >
        <Image
          src={campaign.imageUrl}
          alt=""
          fill
          sizes="100vw"
          preload
          className="object-cover object-right sm:object-center"
        />
        {campaign.copyOverride ? (
          <DeliveryBannerCopy {...campaign} />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-transparent sm:hidden"
          />
        )}
        <span
          aria-hidden="true"
          style={campaign.copyOverride ? { display: "none" } : undefined}
          className="container-page absolute inset-x-0 inset-y-0 flex flex-col justify-center text-white sm:hidden"
        >
          <span className="text-sm font-medium opacity-90 md:text-base">
            {campaign.eyebrow}
          </span>
          <span className="mt-2 max-w-[18ch] whitespace-pre-line text-[1.75rem] font-bold leading-tight md:text-[2.5rem]">
            {campaign.title}
          </span>
          <span className="mt-2 text-sm opacity-90 md:text-lg">
            {campaign.sub}
          </span>
          <span className="mt-4 inline-flex w-fit rounded-full bg-surface px-4 py-1.5 text-sm font-bold text-ink">
            {campaign.cta} →
          </span>
        </span>
      </Link>
    </section>
  );
}
