// 화면 사이 이동 경로 (A 담당)
// 상품·채소 화면은 B 담당이라 아직 없을 수 있어요. 없는 경로로 링크가 걸리지 않도록
// B가 해당 화면을 main에 합치면 아래 값을 true 로 바꿔 주세요. (docs/handoff-A.md 참고)

const PAGE_READY = {
  productList: false, // /products
  productDetail: false, // /products/[id]
  vegetableDetail: false, // /vegetables/[id]
};

export const routes = {
  home: "/",
  story: "/story",
  recipes: "/recipes",
  recipe: (id: string) => `/recipes/${id}`,
  recipesByVegetable: (vegetableId: string) =>
    `/recipes?vegetable=${encodeURIComponent(vegetableId)}`,

  // 아직 만들어지지 않았으면 null 을 돌려줘요. 화면에서는 링크를 그리지 않아요.
  productList: PAGE_READY.productList ? "/products" : null,
  product: (id: string) =>
    PAGE_READY.productDetail ? `/products/${id}` : null,
  vegetable: (id: string) =>
    PAGE_READY.vegetableDetail ? `/vegetables/${id}` : null,
};
