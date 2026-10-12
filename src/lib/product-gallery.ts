import gallery from "../data/product-gallery.json" with { type: "json" };

const photosByVegetable: Record<string, string[]> = gallery;
const fileName = (url: string) => url.split("?")[0].split("/").pop();

export function getProductImages(product: {
  imageUrl?: string;
  vegetableId?: string;
}): string[] {
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
