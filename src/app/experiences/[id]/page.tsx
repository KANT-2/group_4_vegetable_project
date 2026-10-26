import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionReserve } from "@/components/experiences/SessionReserve";
import { ApiError, getExperience } from "@/lib/experiences-api";
import { formatPrice } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    return { title: (await getExperience((await params).id)).title };
  } catch {
    return { title: "체험 예약" };
  }
}

// 주소: /experiences/kimjang-class
export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let experience;
  try {
    experience = await getExperience(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <p
        role="alert"
        className="rounded-card bg-danger-soft p-4 text-center text-danger"
      >
        {e instanceof ApiError ? e.message : "체험 정보를 불러오지 못했어요."}
      </p>
    );
  }

  return (
    <article>
      <Link
        href="/experiences"
        className="text-sm text-ink-muted hover:text-brand"
      >
        ← 체험 목록
      </Link>
      <header className="mt-3">
        <p className="text-xs font-bold tracking-[0.1em] text-brand">
          {experience.region}
        </p>
        <h1 className="mt-1 text-[1.5rem] font-extrabold text-ink md:text-[1.875rem]">
          {experience.title}
        </h1>
        <p className="mt-1 text-ink-muted">{experience.farm_name}</p>
      </header>
      <p className="mt-4 max-w-2xl text-ink">{experience.description}</p>
      <p className="mt-4 text-lg font-bold text-ink">
        {experience.fee > 0 ? formatPrice(experience.fee) : "무료"}
        <span className="ml-2 text-sm font-normal text-ink-muted">
          1인 · 참가비는 현장에서 안내하며 이 화면에서 결제하지 않아요.
        </span>
      </p>

      <h2 className="mt-10 text-xl font-extrabold text-ink">회차 선택</h2>
      <SessionReserve
        experienceId={experience.id}
        sessions={experience.sessions}
      />
    </article>
  );
}
