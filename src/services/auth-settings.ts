import "server-only";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSiteOrigin } from "@/lib/auth-urls";

export async function getGoogleLoginStatus() {
  const config = getSupabaseConfig();
  if (!config)
    return { ready: false, message: "Google 로그인을 준비하고 있어요." };
  try {
    getSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("auth settings unavailable");
    const settings = await response.json();
    return settings.external?.google === true
      ? { ready: true, message: "" }
      : {
          ready: false,
          message:
            "Google 로그인을 준비하고 있어요. 잠시 후 다시 시도해 주세요.",
        };
  } catch {
    return {
      ready: false,
      message: "로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}
