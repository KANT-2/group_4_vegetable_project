// 메뉴 아래 화면 제목. 전체 상품 코너 제목(ProductSection)과 같은 모양으로 맞춰요.
// 가운데 정렬 · 22px → PC 28px · 보통 두께 + 회색 설명 한 줄

export function PageHeading({
  emoji,
  title,
  description,
  as: Tag = "h1",
  className = "",
}: {
  emoji?: string;
  title: string;
  description?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <Tag className="text-[1.375rem] font-medium leading-snug text-ink md:text-[1.75rem]">
        {emoji && <span aria-hidden>{emoji} </span>}
        {title}
      </Tag>
      {description && (
        <p className="mt-1 text-sm text-ink-muted md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
