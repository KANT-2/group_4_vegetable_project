import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { products } from "../src/data/mock/products.ts";
import { UGLY_REASON_LABELS } from "../src/types/product.ts";
import { getProductImages } from "../src/lib/product-gallery.ts";
import { getDiscountRate } from "../src/lib/format.ts";
import { routes } from "../src/lib/routes.ts";

const jsx = (type, props) => ({ type, props });
const modules = {
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "next/link": { default: "a" },
  "@/types/product": { UGLY_REASON_LABELS },
  "@/lib/product-gallery": { getProductImages },
  "@/lib/format": { getDiscountRate },
  "./QuickAddButton": { QuickAddButton: "quick-add" },
  "@/components/products/ProductImageRotator": {
    ProductImageRotator: "rotator",
  },
  "@/lib/routes": { routes },
  "@/schemas/recipe": {
    recipeIdSchema: { safeParse: (id) => ({ success: true, data: id }) },
  },
};

function load(path) {
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  );
  const exports = {};
  new Function("require", "exports", outputText)(
    (name) => modules[name] ?? new Proxy({}, { get: (_, key) => key }),
    exports,
  );
  return exports;
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree?.props) return [];
  return [tree, ...nodes(tree.props.children)];
}

test("레시피의 연결 상품도 농가별 갤러리를 사용하고 담기 버튼은 기존처럼 숨긴다", async () => {
  const carrots = products.filter(
    (p) => p.isActive && p.vegetableId === "carrot",
  );
  modules["@/services/recipes"] = {
    getRecipe: async () => ({
      name: "당근 라페",
      products: carrots,
      relatedRecipes: [],
    }),
  };
  const { ProductPreviewCard } = load(
    "../src/components/common/ProductPreviewCard.tsx",
  );
  modules["@/components/common/ProductPreviewCard"] = { ProductPreviewCard };
  const { default: RecipePage } = load("../src/app/recipes/[id]/page.tsx");
  const tree = await RecipePage({
    params: Promise.resolve({ id: "easy-carrot-1" }),
  });
  const cards = nodes(tree).filter((node) => node.type === ProductPreviewCard);
  assert.equal(cards.length, carrots.length);
  for (const [i, card] of cards.entries()) {
    const rendered = nodes(ProductPreviewCard(card.props));
    assert.deepEqual(
      rendered.find((node) => node.type === "rotator").props.images,
      getProductImages(carrots[i]),
      carrots[i].id,
    );
    assert.ok(!rendered.some((node) => node.type === "quick-add"));
  }
});
