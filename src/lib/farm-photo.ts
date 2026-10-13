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
    imageUrl: "/images/farms/tomato-greenhouse.webp",
    alt: "빨간 토마토가 줄지어 달린 온실 풍경",
  },
  tomatoRipe: {
    imageUrl: "/images/farms/tomato-ripe.webp",
    alt: "하우스 안에서 빨갛게 익은 토마토",
  },
  spinach: {
    imageUrl: "/images/farms/spinach-field.webp",
    alt: "이랑을 따라 자란 시금치밭 풍경",
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
  spinach: FIELD.spinach,
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

// 같은 작물을 키워도 농가가 다르면 다른 사진을 보여 줘요. (출처는 src/data/farm-photo-assets.json)
// 여기 없는 농가는 아래 CROP_PHOTOS(작물별 대표 사진)를 써요.
const FARM_PHOTOS: Record<string, FarmPhoto> = {
  "담양 햇살농장": FIELD.tomatoRipe,
  "영주 사과마을": {
    imageUrl: "/images/farms/youngju-orchard.webp",
    alt: "붉은 사과가 달린 사과 과수원 풍경",
  },
  "제주 구좌당근": {
    imageUrl: "/images/farms/jeju-gujwa-field.webp",
    alt: "돌담 사이로 고랑이 이어진 제주 구좌 채소밭",
  },
  "여주 고구마농원": {
    imageUrl: "/images/farms/sweet-potato-rows.webp",
    alt: "산 아래 이랑마다 고구마 덩굴이 자란 고구마밭",
  },
  "고창 황토무밭": {
    imageUrl: "/images/farms/radish-field.webp",
    alt: "초록 무청이 무성한 무밭",
  },
  "춘천 호박농원": {
    imageUrl: "/images/farms/zucchini-harvest.webp",
    alt: "밭에서 애호박을 따는 농부의 손",
  },
  "진주 들판농장": {
    imageUrl: "/images/farms/zucchini-plants.webp",
    alt: "넓은 잎 사이로 애호박이 자라는 호박밭",
  },
  "청양 고추농가": {
    imageUrl: "/images/farms/chili-field.webp",
    alt: "비닐을 깐 고랑에 풋고추가 주렁주렁 달린 고추밭",
  },
  "상주 백오이농원": {
    imageUrl: "/images/farms/cucumber-trellis.webp",
    alt: "지주대를 타고 오이 덩굴이 자라는 오이밭",
  },
  "하동 섬진강농장": {
    imageUrl: "/images/farms/eggplant-field.webp",
    alt: "잎이 무성한 가지밭",
  },
  "제주 한림밭": {
    imageUrl: "/images/farms/jeju-hallim-field.webp",
    alt: "현무암 돌담으로 둘러싼 제주 채소밭과 농가",
  },
  "해남 땅끝배추": {
    imageUrl: "/images/farms/napa-cabbage-harvest.webp",
    alt: "배추를 수확해 상자에 담는 배추밭",
  },
  "괴산 배추마을": {
    imageUrl: "/images/farms/napa-cabbage-rows.webp",
    alt: "줄지어 자라는 배추 포기",
  },
  "김제 유리온실": {
    imageUrl: "/images/farms/paprika-hydroponic.webp",
    alt: "온실에서 수경재배로 키우는 파프리카",
  },
  "경주 단호박농장": {
    imageUrl: "/images/farms/pumpkin-field.webp",
    alt: "넝쿨 사이로 호박이 익어 가는 호박밭",
  },
  "화성 버섯하우스": {
    imageUrl: "/images/farms/mushroom-shelves.webp",
    alt: "재배사 선반에 줄지어 놓인 버섯 배지",
  },
  "무안 양파밭": {
    imageUrl: "/images/farms/onion-field.webp",
    alt: "파란 하늘 아래 넓게 펼쳐진 양파밭",
  },
  "창녕 양파마을": {
    imageUrl: "/images/farms/onion-field-close.webp",
    alt: "양파 줄기가 곧게 자란 양파밭",
  },
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
  // 농가마다 따로 고른 사진
  const own = FARM_PHOTOS[farm.farmName];
  if (own) return { ...own, position: "object-center" };
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
