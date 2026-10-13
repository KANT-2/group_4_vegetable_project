// 메뉴 아래 화면 제목. 구역 제목(SectionHeading)과 같은 모양으로 맞춰요.
// 가운데 정렬 · 작은 영문 라벨 → 22px(PC 28px) 아주 굵은 제목 → 회색 설명 한 줄

export function PageHeading({
  eyebrow,
  title,
  description,
  as: Tag = "h1",
  className = "",
}: {
  eyebrow?: string; // 예: "RECIPE"
  title: string;
  description?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      {eyebrow && (
        <p className="mb-1.5 text-xs font-bold tracking-[0.14em] text-brand md:text-[0.8125rem]">
          {eyebrow}
        </p>
      )}
      <Tag className="text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em] text-ink md:text-[1.75rem]">
        {title}
      </Tag>
      {description && (
        <p className="mt-2 text-sm text-ink-muted md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
