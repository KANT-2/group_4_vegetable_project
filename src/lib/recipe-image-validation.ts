export function recipeImageError(
  existingCount: number,
  files: { type: string; size: number }[],
  maxImages = 3,
) {
  if (existingCount + files.length > maxImages)
    return `이미지는 최대 ${maxImages}장까지 등록할 수 있습니다.`;
  if (
    files.some(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    )
  )
    return "JPG·PNG·WebP 이미지만 선택해 주세요.";
  if (files.some((file) => file.size > 5 * 1024 * 1024))
    return "이미지는 한 장당 5MB 이하여야 합니다.";
  return "";
}
