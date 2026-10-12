import "server-only";
import { createClient } from "@/lib/supabase/server";
import { vegetables as mockVegetables } from "@/data/mock/vegetables";
import { vegetableCategorySchema } from "@/schemas/vegetable";
import type { Database } from "@/types/database";
import type { Vegetable } from "@/types/vegetable";
import { isMockCatalog, toImageSrc } from "./catalog-source";

type VegetableRow = Database["public"]["Tables"]["vegetables"]["Row"];

// DB 한 줄(snake_case) → 화면용 이름표(camelCase)
export function toVegetable(row: VegetableRow): Vegetable {
  return {
    id: row.id,
    name: row.name,
    category: vegetableCategorySchema.parse(row.category),
    description: row.description,
    storageGuide: row.storage_guide ?? undefined,
    prepGuide: row.prep_guide ?? undefined,
    season: row.season ?? undefined,
    imageUrl: toImageSrc(row.image_path),
  };
}

export async function getVegetables(): Promise<Vegetable[]> {
  if (isMockCatalog()) return mockVegetables;

  const supabase = await createClient();
  const { data, error } = await supabase.from("vegetables").select("*");
  if (error) throw new Error("채소 정보를 불러오지 못했어요.");
  return data.map(toVegetable);
}

export async function getVegetableById(id: string): Promise<Vegetable | null> {
  if (isMockCatalog()) return mockVegetables.find((v) => v.id === id) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vegetables")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("채소 정보를 불러오지 못했어요.");
  return data ? toVegetable(data) : null;
}
