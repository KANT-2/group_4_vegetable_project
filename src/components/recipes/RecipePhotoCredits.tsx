import type { Recipe } from "@/types/recipe";

export function RecipePhotoCredits({ recipes }: { recipes: Recipe[] }) {
  const photos = [
    ...new Map(
      recipes
        .filter((r) => r.photoReference)
        .map((r) => [r.photoReference!.imageUrl, r.photoReference!]),
    ).values(),
  ];
  if (!photos.length) return null;
  return (
    <details className="my-6 rounded-card border border-line bg-surface p-4 text-sm text-ink-muted">
      <summary className="cursor-pointer font-bold text-ink">사진 출처</summary>
      <ul className="mt-3 space-y-3">
        {photos.map((photo) => (
          <li key={photo.imageUrl}>
            <a
              href={photo.source}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {photo.title
                .replace("File:", "")
                .replace(" AI 요리 참고 이미지", " 이미지")
                .replace(" AI 참고 이미지", " 이미지")}
            </a>{" "}
            · {photo.generated ? "OpenAI 제작" : photo.author} ·{" "}
            {photo.generated ? (
              <span>화면 크롭</span>
            ) : (
              <>
                <a
                  href={photo.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {photo.license}
                </a>{" "}
                · Wikimedia Commons 축소본 / 화면 크롭
              </>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
