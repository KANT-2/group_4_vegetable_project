import { getDataSource } from "@/lib/data-source";

export function RecipeDataNotice() {
  return (
    <p className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
      공식 자료의 재료·조리 과정을 요약했어요. 원문에 없는 시간과 난이도는
      표시하지 않아요.
      {getDataSource() === "mock" &&
        " 함께 표시되는 판매 상품은 시연용 예시예요."}
    </p>
  );
}
