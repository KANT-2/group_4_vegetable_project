import "server-only";
import { toImageSrc } from "@/services/catalog-source";

// 체험 사진 주소: 앱 안의 농장 사진("/images/…")은 그대로 쓰고,
// 나머지("products/…")는 저장소(Storage) 상대 경로로 보고 상품 사진과 같은 방식으로 바꿔요.
export function experienceImageSrc(path: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/images/")) return path;
  return toImageSrc(path);
}

// 세로로 긴 사진을 가로 틀에 맞춰 자를 때 보여줄 위치 (Tailwind가 읽도록 클래스 이름을 통째로 적어요).
const FOCUS: Record<string, string> = {
  "/images/experiences/carrot-harvest.webp": "object-[50%_12%]",
  "/images/experiences/kimjang-class.webp": "object-[50%_72%]",
};

export function experienceImageFocus(path: string | null): string {
  return (path && FOCUS[path]) || "object-center";
}
