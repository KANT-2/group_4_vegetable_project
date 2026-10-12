// 레시피 대표 이미지. 요리 사진이 아직 없으면 재료(채소) 사진을 임시로 보여주고 "재료 사진" 꼬리표를 붙여요.
// 둘 다 없으면 SafeImage 의 대체 화면이 나와요.

import { SafeImage } from "@/components/common/SafeImage";
import type { Recipe } from "@/types/recipe";

interface RecipeImageProps {
  recipe: Pick<Recipe, "name" | "imageUrl" | "vegetables" | "photoReference">;
  className?: string;
  priority?: boolean;
}

export function RecipeImage({
  recipe,
  className = "",
  priority,
}: RecipeImageProps) {
  const dishUrl = recipe.imageUrl;
  const substituteUrl = recipe.vegetables.find(
    (vegetable) => vegetable.imageUrl,
  )?.imageUrl;
  const isSubstitute = !dishUrl && Boolean(substituteUrl);

  return (
    <div className="relative">
      <SafeImage
        src={dishUrl ?? substituteUrl}
        alt={
          recipe.photoReference
            ? `${recipe.name}의 ${recipe.photoReference.generated ? "AI 요리 참고 이미지" : "유사 요리 참고 사진"} (실제 조리 결과 아님)`
            : isSubstitute
              ? `${recipe.name}에 쓰는 재료 사진`
              : `${recipe.name} 사진`
        }
        className={className}
        priority={priority}
        placeholderText="요리 사진 준비 중"
      />
      {recipe.photoReference && (
        <span className="absolute bottom-3 left-3 rounded-full bg-surface/95 px-3 py-1 text-xs text-bark">
          {recipe.photoReference.generated
            ? "AI 요리 참고 이미지"
            : `유사 요리 참고 사진 · ${recipe.photoReference.license}`}
        </span>
      )}
      {isSubstitute && (
        <span className="chip absolute bottom-3 left-3 bg-surface/95 text-bark">
          재료 사진 · 요리 사진 준비 중
        </span>
      )}
    </div>
  );
}
