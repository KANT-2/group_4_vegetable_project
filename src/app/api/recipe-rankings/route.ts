import { getRecipeRankings } from "@/services/recipe-rankings";

export async function GET() {
  try {
    return Response.json(
      { items: await getRecipeRankings() },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json(
      { error: "순위를 불러오지 못했어요." },
      { status: 503 },
    );
  }
}
