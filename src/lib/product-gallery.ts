import gallery from "../data/product-gallery.json" with { type: "json" };
import productPhotos from "../data/product-photo-overrides.json" with { type: "json" };

const photosByVegetable: Record<string, string[]> = gallery;
const photosByProduct: Record<string, string[]> = productPhotos;
const fileName = (url: string) => url.split("?")[0].split("/").pop();

export function getProductImages(product: {
  id?: string;
  imageUrl?: string;
  vegetableId?: string;
}): string[] {
  if (product.imageUrl?.startsWith("data:")) return [product.imageUrl];
  const selected = photosByProduct[product.id ?? ""];
  if (Array.isArray(selected)) return [...selected];
  const candidates = photosByVegetable[product.vegetableId ?? ""] ?? [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const url of [product.imageUrl, ...candidates]) {
    if (!url) continue;
    const key = fileName(url) ?? url;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(url);
    if (result.length === 3) break;
  }
  return result;
}
