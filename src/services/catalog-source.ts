import "server-only";
import { getImageUrl } from "@/lib/storage";
import { getDataSource } from "@/lib/data-source";

// .env.local에 Supabase 값이 없으면 Mock Data로 화면을 보여 줘요.
// (키가 없는 팀원도 화면 작업을 할 수 있게)
export function isMockCatalog() {
  return getDataSource() === "mock";
}

// DB의 image_path("products/carrot.jpg")를 화면용 주소로 바꿔요.
// DB 연결 시: Storage(market-images)의 공개 주소
// Mock 모드: public/images의 같은 파일 (Storage에 올린 사진과 같아요)
export function toImageSrc(path: string | null): string | undefined {
  if (!path) return undefined;
  if (!isMockCatalog()) return getImageUrl(path) ?? undefined;
  const fileName = path.split("/").pop();
  return fileName ? `/images/${fileName}` : undefined;
}
