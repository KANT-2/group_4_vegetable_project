// 조리 순서: 번호가 붙은 목록 (순서가 곧 의미라서 <ol> 사용)

export function RecipeSteps({ steps }: { steps: string[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-ink-muted">조리 순서가 아직 등록되지 않았어요.</p>
    );
  }
  return (
    <ol className="space-y-5">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-4">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-extrabold text-white"
          >
            {index + 1}
          </span>
          <p className="min-w-0 flex-1 pt-1">
            <span className="sr-only">{index + 1}단계: </span>
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}
