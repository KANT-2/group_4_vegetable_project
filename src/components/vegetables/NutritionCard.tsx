import type { NutritionProfile } from "@/services/nutrition";

type Row = {
  label: string;
  unit: string;
  value: (p: NutritionProfile) => number | null;
};

const ROWS: Row[] = [
  { label: "열량", unit: "kcal", value: (p) => p.energyKcal },
  { label: "탄수화물", unit: "g", value: (p) => p.carbohydrateG },
  { label: "단백질", unit: "g", value: (p) => p.proteinG },
  { label: "지방", unit: "g", value: (p) => p.fatG },
  { label: "칼륨", unit: "mg", value: (p) => p.potassiumMg },
  { label: "비타민 C", unit: "mg", value: (p) => p.vitaminCMg },
];

// "국내산 적색" → "적색", "품종 미상" → "" (한 종류뿐이면 머리글 생략)
function varietyLabel(variety: string) {
  if (variety === "품종 미상") return "";
  return variety.replace(/^국내산\s*/, "").replace(/\s*\/.*$/, "");
}

function formatValue(row: Row, profile: NutritionProfile) {
  const value = row.value(profile);
  if (value !== null) return `${value}${row.unit}`;
  if (row.label === "지방" && profile.fatIsTrace) return "미량";
  if (row.label === "비타민 C" && profile.vitaminCIsTrace) return "미량";
  return "-";
}

export default function NutritionCard({
  profiles,
  source,
}: {
  profiles: NutritionProfile[];
  source: string;
}) {
  const showHeader = profiles.length > 1;

  return (
    <section className="mt-4 rounded-card bg-surface p-5 ring-1 ring-line">
      <h2 className="font-bold text-ink">영양 정보</h2>
      {profiles.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">영양 정보 준비 중이에요.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-muted">
            100g당
            {/* 한 종류뿐이면 머리글 대신 어떤 품종 기준인지 한 줄로 */}
            {!showHeader && varietyLabel(profiles[0].variety) && (
              <> · {varietyLabel(profiles[0].variety)} 기준</>
            )}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              {showHeader && (
                <thead>
                  <tr className="border-b border-line text-ink-muted">
                    <th className="py-2 pr-3 text-left font-normal">성분</th>
                    {profiles.map((p) => (
                      <th
                        key={p.id}
                        className="px-2 py-2 text-right font-semibold"
                      >
                        {varietyLabel(p.variety)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-line last:border-0"
                  >
                    <th className="py-2 pr-3 text-left font-normal text-ink-muted">
                      {row.label}
                    </th>
                    {profiles.map((p) => (
                      <td
                        key={p.id}
                        className="px-2 py-2 text-right font-semibold text-ink"
                      >
                        {formatValue(row, p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-muted">출처: {source}</p>
        </>
      )}
    </section>
  );
}
