"use server";

import { revalidatePath } from "next/cache";
import { getExperienceAuth } from "@/lib/experiences-auth";
import * as api from "@/lib/experiences-api";
import { FastApiError } from "@/lib/fastapi";
import type { ActionResult } from "@/types/action";

// 서버 액션: 브라우저가 아니라 서버가 쿠키의 토큰으로 FastAPI 를 불러요. 사용자 ID 는 받지 않아요.
async function run(
  work: (token: string) => Promise<unknown>,
  fallback: string,
): Promise<ActionResult> {
  const auth = await getExperienceAuth();
  if (!auth) return { ok: false, error: "로그인이 필요해요." };
  try {
    await work(auth.token);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof FastApiError ? error.message : fallback,
    };
  }
  revalidatePath("/experiences", "layout");
  return { ok: true };
}

export async function reserveAction(
  experienceId: string,
  sessionId: string,
  headcount: number,
) {
  return run(
    (token) => api.reserve(token, experienceId, sessionId, headcount),
    "예약하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  );
}

export async function cancelReservationAction(reservationId: string) {
  return run(
    (token) => api.cancelReservation(token, reservationId),
    "취소하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  );
}

export async function closeSessionAction(sessionId: string) {
  return run(
    (token) => api.closeSession(token, sessionId),
    "마감하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  );
}
