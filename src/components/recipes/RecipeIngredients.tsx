// 재료와 수량 목록. 이름과 수량이 길어도 줄바꿈되고, 수량은 오른쪽에 맞춰 보여줘요.

import type { RecipeIngredient } from "@/types/recipe";

export function RecipeIngredients({
  ingredients,
}: {
  ingredients: RecipeIngredient[];
}) {
  if (ingredients.length === 0) {
    return <p className="text-ink-muted">재료가 아직 등록되지 않았어요.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {ingredients.map((ingredient, index) => (
        <li
          key={index}
          className="flex items-baseline justify-between gap-4 py-3"
        >
          <span className="min-w-0 font-bold">{ingredient.name}</span>
          <span className="min-w-0 max-w-[55%] text-right text-ink-muted">
            {ingredient.amount}
          </span>
        </li>
      ))}
    </ul>
  );
}
