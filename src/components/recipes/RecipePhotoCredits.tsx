import type { Recipe } from "@/types/recipe";

export function RecipePhotoCredits({ recipes }: { recipes: Recipe[] }) {
  const photos = [
    ...new Map(
      recipes
        .filter((r) => r.photoReference)
        .map((r) => [r.photoReference!.source, r.photoReference!]),
    ).values(),
  ];
  if (!photos.length) return null;
  return (
    <details className="my-6 rounded-card border border-line bg-surface p-4 text-sm text-ink-muted">
      <summary className="cursor-pointer font-bold text-ink">
        요리 참고 사진 · 출처와 사용 조건
      </summary>
      <p className="mt-3">
        사진은 유사한 요리의 참고 이미지이며 이 레시피를 그대로 조리한 결과는
        아니에요. 재료·양·조리 결과는 다를 수 있어요.
      </p>
      <ul className="mt-3 space-y-3">
        {photos.map((photo) => (
          <li key={photo.source}>
            <a
              href={photo.source}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {photo.title.replace("File:", "")}
            </a>{" "}
            · {photo.author} ·{" "}
            <a
              href={photo.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {photo.license}
            </a>{" "}
            · Wikimedia Commons 축소본 / 화면 크롭
          </li>
        ))}
      </ul>
    </details>
  );
}
