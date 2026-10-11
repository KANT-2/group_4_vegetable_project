// 화면 데이터를 어디서 가져올지 정해요: 개발용 Mock / 실제 Supabase DB
// - Supabase 환경변수가 모두 있으면 DB를 사용해요.
// - 없거나 USE_MOCK_DATA=true 이면 개발용 Mock 데이터를 사용해요.
// DB 요청이 실패해도 Mock으로 몰래 바꾸지 않아요. 오류는 그대로 오류 화면으로 가요.

export type DataSource = "mock" | "supabase";

export function getDataSource(): DataSource {
  if (process.env.USE_MOCK_DATA === "true") return "mock";
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return hasSupabase ? "supabase" : "mock";
}
