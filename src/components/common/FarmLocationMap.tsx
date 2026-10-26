import { farmMapUrls } from "@/lib/farm-location";

export function FarmLocationMap({
  name,
  address,
  latitude,
  longitude,
  mapEmbedUrl,
  fallback,
}: {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  mapEmbedUrl?: string;
  fallback?: string;
}) {
  const urls = farmMapUrls(
    { address, latitude, longitude, mapEmbedUrl },
    fallback,
  );
  if (!urls.query)
    return (
      <p className="rounded-card bg-sand p-5 text-sm text-ink-muted">
        상세 주소를 입력하면 지도에서 위치를 확인할 수 있습니다.
      </p>
    );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">{address || fallback}</p>
        <a
          href={urls.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-sm font-bold text-brand"
        >
          Google 지도에서 열기 ↗
        </a>
      </div>
      <iframe
        title={`${name || "농가"} 위치 지도`}
        src={urls.embed}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="h-64 w-full rounded-card border border-line"
      />
    </div>
  );
}
