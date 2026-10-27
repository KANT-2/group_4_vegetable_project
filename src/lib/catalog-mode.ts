// Catalog uses FastAPI by default. Mock is an explicit offline preview only.
export function isFastApiCatalog() {
  return process.env.CATALOG_SOURCE !== "mock";
}
