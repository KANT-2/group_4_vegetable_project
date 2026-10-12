import type { FarmStory } from "../types/showcase";

const CROP_PHOTOS: Record<string, { imageUrl: string; alt: string }> = {
  apple: {
    imageUrl: "/images/farms/apple-orchard.webp",
    alt: "사과나무에 사과가 열린 과수원 풍경",
  },
  tomato: {
    imageUrl: "/images/farms/greenhouse.webp",
    alt: "토마토를 재배하는 온실 풍경",
  },
};

// 농가 표시 순서와 무관하게 대표 상품의 작물에 맞는 사진을 선택해요.
// 맞는 재배 사진이 없으면 해당 작물의 상품 사진을 사용해요.
export function getFarmPhoto(farm: FarmStory): {
  imageUrl: string;
  alt: string;
} {
  if (farm.farmName === "영주 사과마을") {
    return {
      imageUrl: "/images/farms/youngju-orchard.webp",
      alt: "붉은 사과가 달린 사과 과수원 풍경",
    };
  }
  const lead = farm.products[0];
  return (
    CROP_PHOTOS[lead?.vegetableId] ?? {
      imageUrl: lead?.imageUrl ?? "",
      alt: lead ? `${lead.vegetableName} 농산물 사진` : "농가 사진 준비 중",
    }
  );
}
