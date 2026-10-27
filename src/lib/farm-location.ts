export function validGoogleEmbed(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["www.google.com", "maps.google.com"].includes(url.hostname) &&
      url.pathname === "/maps/embed" &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}

export function parseFarmLocation(
  address: string,
  latitudeText: string,
  longitudeText: string,
  mapEmbedUrl: string,
):
  | {
      ok: true;
      value: {
        address: string;
        latitude?: number;
        longitude?: number;
        mapEmbedUrl: string;
      };
    }
  | { ok: false; error: string } {
  if (!address.trim())
    return { ok: false, error: "농가의 상세 주소를 입력해 주세요." };
  if (Boolean(latitudeText.trim()) !== Boolean(longitudeText.trim()))
    return { ok: false, error: "위도와 경도는 함께 입력해 주세요." };
  const latitude = latitudeText.trim() ? Number(latitudeText) : undefined;
  const longitude = longitudeText.trim() ? Number(longitudeText) : undefined;
  if (
    (latitude !== undefined &&
      (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
    (longitude !== undefined &&
      (!Number.isFinite(longitude) || Math.abs(longitude) > 180))
  )
    return {
      ok: false,
      error: "위도는 -90~90, 경도는 -180~180 사이의 숫자로 입력해 주세요.",
    };
  if (!validGoogleEmbed(mapEmbedUrl))
    return {
      ok: false,
      error:
        "Google 지도 공유의 '지도 퍼가기'에서 복사한 https://www.google.com/maps/embed 주소를 입력해 주세요.",
    };
  return {
    ok: true,
    value: {
      address: address.trim(),
      latitude,
      longitude,
      mapEmbedUrl: mapEmbedUrl.trim(),
    },
  };
}

export function farmMapUrls(
  location: {
    address?: string;
    latitude?: number;
    longitude?: number;
    mapEmbedUrl?: string;
  },
  fallback = "",
) {
  const coordinates =
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    Math.abs(location.latitude) <= 90 &&
    Math.abs(location.longitude) <= 180;
  const query = coordinates
    ? `${location.latitude},${location.longitude}`
    : location.address?.trim() || fallback;
  const encoded = encodeURIComponent(query);
  return {
    embed:
      location.mapEmbedUrl?.trim() && validGoogleEmbed(location.mapEmbedUrl)
        ? location.mapEmbedUrl.trim()
        : `https://maps.google.com/maps?q=${encoded}&hl=ko&z=${coordinates || location.address ? 16 : 10}&output=embed`,
    link: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    query,
  };
}
