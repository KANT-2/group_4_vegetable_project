import type { FarmStory } from "../types/showcase";

interface FarmPhoto {
  imageUrl: string;
  alt: string;
}

// 농장 풍경 사진 (출처는 src/data/farm-photo-assets.json)
const FIELD = {
  apple: {
    imageUrl: "/images/farms/apple-orchard.webp",
    alt: "사과나무에 사과가 열린 과수원 풍경",
  },
  tomato: {
    imageUrl: "/images/farms/greenhouse.webp",
    alt: "토마토를 재배하는 온실 풍경",
  },
  potato: {
    imageUrl: "/images/farms/potato-field.webp",
    alt: "흰 감자꽃이 핀 감자밭 풍경",
  },
  carrot: {
    imageUrl: "/images/farms/carrot-field.webp",
    alt: "당근 잎이 줄지어 자란 당근밭 풍경",
  },
  rootField: {
    imageUrl: "/images/farms/sweet-potato-field.webp",
    alt: "초록 잎이 덮인 넓은 밭 풍경",
  },
  leafField: {
    imageUrl: "/images/farms/cabbage-field.webp",
    alt: "산 아래 고랭지 배추·양배추밭 풍경",
  },
  greenOnion: {
    imageUrl: "/images/farms/green-onion-field.webp",
    alt: "흙을 북돋아 키운 대파밭 풍경",
  },
  vineHouse: {
    imageUrl: "/images/farms/cucumber-greenhouse.webp",
    alt: "덩굴 채소가 자라는 비닐하우스 풍경",
  },
  glassHouse: {
    imageUrl: "/images/farms/vegetable-greenhouse.webp",
    alt: "채소를 키우는 유리온실 풍경",
  },
  mushroom: {
    imageUrl: "/images/farms/shiitake-logs.webp",
    alt: "숲속에 세워 둔 표고버섯 원목 풍경",
  },
  mandarin: {
    imageUrl: "/images/farms/mandarin-orchard.webp",
    alt: "주황빛 귤이 달린 제주 귤 과수원 풍경",
  },
  village: {
    imageUrl: "/images/farms/fields.webp",
    alt: "마을 옆으로 펼쳐진 밭 풍경",
  },
} satisfies Record<string, FarmPhoto>;

// 작물(채소 id) → 그 작물을 키우는 농장 풍경
const CROP_PHOTOS: Record<string, FarmPhoto> = {
  apple: FIELD.apple,
  tomato: FIELD.tomato,
  potato: FIELD.potato,
  carrot: FIELD.carrot,
  "sweet-potato": FIELD.rootField,
  radish: FIELD.rootField,
  cabbage: FIELD.leafField,
  "napa-cabbage": FIELD.leafField,
  broccoli: FIELD.leafField,
  "green-onion": FIELD.greenOnion,
  spinach: FIELD.greenOnion,
  cucumber: FIELD.vineHouse,
  aehobak: FIELD.vineHouse,
  eggplant: FIELD.vineHouse,
  chili: FIELD.vineHouse,
  paprika: FIELD.glassHouse,
  "sweet-pumpkin": FIELD.glassHouse,
  shiitake: FIELD.mushroom,
  "king-oyster": FIELD.mushroom,
  mandarin: FIELD.mandarin,
  onion: FIELD.village,
};

// 같은 풍경을 쓰는 농가끼리 똑같아 보이지 않게, 농가 이름으로 사진의 다른 부분을 보여 줘요.
const POSITIONS = ["object-center", "object-left", "object-right"] as const;

function positionFor(farmName: string): (typeof POSITIONS)[number] {
  let hash = 0;
  for (const char of farmName) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return POSITIONS[hash % POSITIONS.length];
}

// 농가 표시 순서와 무관하게 대표 상품의 작물에 맞는 사진을 선택해요.
// 맞는 재배 사진이 없으면 해당 작물의 상품 사진을 사용해요.
export function getFarmPhoto(
  farm: FarmStory,
): FarmPhoto & { position: string } {
  if (farm.farmName === "영주 사과마을") {
    return {
      imageUrl: "/images/farms/youngju-orchard.webp",
      alt: "붉은 사과가 달린 사과 과수원 풍경",
      position: "object-center",
    };
  }
  const lead = farm.products[0];
  const photo = CROP_PHOTOS[lead?.vegetableId];
  if (photo) return { ...photo, position: positionFor(farm.farmName) };
  return {
    imageUrl: lead?.imageUrl ?? "",
    alt: lead ? `${lead.vegetableName} 농산물 사진` : "농가 사진 준비 중",
    position: "object-center",
  };
}

// 목록에서 같은 풍경이 여러 번 나오면, 나올 때마다 사진의 다른 부분을 보여 줘요.
const VARIANTS = [
  "object-center",
  "object-left",
  "object-right",
  "object-[25%_50%]",
  "object-[75%_50%]",
] as const;

export function getFarmPhotos(
  farms: FarmStory[],
): Map<string, FarmPhoto & { position: string }> {
  const seen = new Map<string, number>();
  const photos = new Map<string, FarmPhoto & { position: string }>();
  for (const farm of farms) {
    const photo = getFarmPhoto(farm);
    const count = seen.get(photo.imageUrl) ?? 0;
    seen.set(photo.imageUrl, count + 1);
    photos.set(farm.farmName, {
      ...photo,
      position:
        photo.position === "object-center" && count === 0
          ? photo.position
          : VARIANTS[count % VARIANTS.length],
    });
  }
  return photos;
}

// 농가 이야기 화면의 "밭에서 식탁까지" 사진 모음
export const FARM_SCENES: (FarmPhoto & {
  label: string;
  vegetableId: string;
})[] = [
  { ...FIELD.potato, label: "감자밭", vegetableId: "potato" },
  { ...FIELD.leafField, label: "고랭지 배추밭", vegetableId: "napa-cabbage" },
  { ...FIELD.carrot, label: "당근밭", vegetableId: "carrot" },
  { ...FIELD.greenOnion, label: "대파밭", vegetableId: "green-onion" },
  { ...FIELD.mushroom, label: "표고 원목", vegetableId: "shiitake" },
  { ...FIELD.vineHouse, label: "오이 하우스", vegetableId: "cucumber" },
  { ...FIELD.glassHouse, label: "파프리카 온실", vegetableId: "paprika" },
  { ...FIELD.mandarin, label: "제주 귤밭", vegetableId: "mandarin" },
  { ...FIELD.rootField, label: "고구마밭", vegetableId: "sweet-potato" },
];
