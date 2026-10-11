// 조리 시간 · 난이도 · 인분을 한 줄로 보여줘요. (카드와 상세 화면 공용)

import { ClockIcon, UsersIcon } from "@/components/common/Icons";
import { RECIPE_DIFFICULTY_LABELS, type Recipe } from "@/types/recipe";

const DIFFICULTY_STYLE = {
  easy: "bg-brand-soft text-brand-dark",
  normal: "bg-accent-soft text-accent",
  hard: "bg-sand text-bark",
} as const;

export function RecipeMeta({
  recipe,
  size = "sm",
}: {
  recipe: Pick<Recipe, "cookTimeMin" | "difficulty" | "servings">;
  size?: "sm" | "lg";
}) {
  const iconSize = size === "lg" ? 20 : 16;
  return (
    <ul
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${size === "lg" ? "text-base" : "text-sm"}`}
      aria-label="레시피 정보"
    >
      {recipe.cookTimeMin != null && (
        <li className="inline-flex items-center gap-1.5">
          <ClockIcon width={iconSize} height={iconSize} />
          <span className="sr-only">조리 시간</span>
          {recipe.cookTimeMin}분
        </li>
      )}
      {recipe.difficulty != null && (
        <li>
          <span className="sr-only">난이도</span>
          <span className={`chip ${DIFFICULTY_STYLE[recipe.difficulty]}`}>
            {RECIPE_DIFFICULTY_LABELS[recipe.difficulty]}
          </span>
        </li>
      )}
      {recipe.servings && (
        <li className="inline-flex items-center gap-1.5">
          <UsersIcon width={iconSize} height={iconSize} />
          <span className="sr-only">기준 인분</span>
          {recipe.servings}인분
        </li>
      )}
    </ul>
  );
}
