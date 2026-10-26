// 기존 상품의 표시명만 분리합니다. 원본 데이터와 DB 값은 변경하지 않습니다.
export function adminProductName(product: {
  name: string;
  farmRegion?: string;
}) {
  let name = product.name
    .replace(
      /\s+\d+(?:\.\d+)?\s*(?:kg|g|ml|l|개|입|봉|팩|단|구|박스)(?:\s*\([^)]*\))?\s*$/i,
      "",
    )
    .trim();
  const locality = product.farmRegion?.trim().split(/\s+/).at(-1);
  if (locality && name.startsWith(`${locality} `))
    name = name.slice(locality.length).trim();
  return name || product.name;
}
