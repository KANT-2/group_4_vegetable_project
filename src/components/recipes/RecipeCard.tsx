// 레시피 카드 (A 담당): 이미지 → 제목 → 짧은 설명 → 조리 시간·난이도 → 주요 재료
// 카드 전체가 하나의 링크라서 손가락으로 누르기 쉬워요.

import Link from "next/link";
import { routes } from "@/lib/routes";
import type { Recipe } from "@/types/recipe";
import { RecipeImage } from "./RecipeImage";
import { RecipeMeta } from "./RecipeMeta";

const MAIN_INGREDIENT_COUNT = 3;

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  // 재료는 중요한 순서로 적는 것이 약속이라 앞쪽 몇 개를 주요 재료로 보여줘요.
  const mainIngredients = recipe.ingredients
    .slice(0, MAIN_INGREDIENT_COUNT)
    .map((ingredient) => ingredient.name);

  return (
    <article className="card group h-full overflow-hidden">
      <Link
        href={routes.recipe(recipe.id)}
        className="flex h-full flex-col focus-visible:outline-offset-[-3px]"
      >
        <RecipeImage
          recipe={recipe}
          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <h3 className="text-lg font-extrabold">{recipe.name}</h3>
          <p className="line-clamp-2 text-ink-muted">{recipe.description}</p>
          <RecipeMeta recipe={recipe} />
          <p className="mt-auto border-t border-line pt-3 text-sm text-ink-muted">
            <span className="font-bold text-ink">주요 재료</span>{" "}
            {mainIngredients.join(" · ")}
          </p>
        </div>
      </Link>
    </article>
  );
}
