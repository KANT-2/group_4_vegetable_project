import Link from "next/link";
import { PageHeading } from "@/components/common/PageHeading";
import { getExperience, listExperiences } from "@/lib/experiences-api";
import { getExperienceContent } from "@/lib/experiences-content";
import { formatSessionTime, type Session } from "@/lib/experiences-types";
import { FastApiError } from "@/lib/fastapi";
import { SafeImage } from "@/components/common/SafeImage";
import {
  experienceImageFocus,
  experienceImageSrc,
} from "@/lib/experiences-image";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "체험 예약" };

const SIZE = 6;

// 주소: /experiences?q=김장&region=강원&page=2
export default async function ExperiencesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const region = typeof sp.region === "string" ? sp.region.trim() : "";
  const page = Math.max(
    1,
    Number(typeof sp.page === "string" ? sp.page : 1) || 1,
  );

  let data = null;
  let error: string | null = null;
  try {
    data = await listExperiences({ q, region, page, size: SIZE });
  } catch (e) {
    error =
      e instanceof FastApiError
        ? e.message
        : "체험 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
  }

  // 카드에 "다음 회차"와 남은 자리를 보여주려고 체험별 회차를 함께 불러와요. 실패해도 목록은 그대로 보여요.
  const sessionsById = new Map<string, Session[]>();
  if (data) {
    const details = await Promise.all(
      data.items.map((e) => getExperience(e.id).catch(() => null)),
    );
    details.forEach((d) => d && sessionsById.set(d.id, d.sessions));
  }
  const nextSession = (id: string) =>
    (sessionsById.get(id) ?? [])
      .filter((s) => s.status === "open" && !s.started && s.remaining > 0)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  const totalPages = data ? Math.max(1, Math.ceil(data.total / SIZE)) : 1;
  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (region) qs.set("region", region);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return `/experiences${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeading
        eyebrow="EXPERIENCE"
        title="체험 예약"
        description="농가에서 직접 수확하고 만들어 보는 체험을 예약해요."
      />

      <form
        action="/experiences"
        className="mx-auto mt-6 flex max-w-2xl flex-wrap gap-2"
        role="search"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="체험·농가 이름"
          aria-label="체험 또는 농가 이름 검색"
          className="h-11 min-w-0 flex-1 rounded-[0.375rem] border border-field-border bg-surface px-4 text-base"
        />
        <input
          name="region"
          defaultValue={region}
          placeholder="지역 (예: 강원)"
          aria-label="지역"
          className="h-11 w-36 rounded-[0.375rem] border border-field-border bg-surface px-4 text-base"
        />
        <button type="submit" className="btn btn-primary">
          검색
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-card bg-danger-soft p-4 text-center text-danger"
        >
          {error}
        </p>
      )}

      {data && (
        <>
          <p className="mb-3 mt-8 text-sm text-ink-muted">
            체험 {data.total}개
          </p>
          {data.items.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/experiences/${e.id}`}
                    className="block h-full overflow-hidden rounded-card bg-surface ring-1 ring-line transition hover:ring-brand"
                  >
                    <SafeImage
                      src={experienceImageSrc(e.image_path)}
                      alt={e.title}
                      className={`aspect-[4/3] w-full object-cover ${experienceImageFocus(e.image_path)}`}
                      placeholderText="사진 준비 중"
                    />
                    <div className="p-5">
                      <p className="text-xs font-bold tracking-[0.1em] text-brand">
                        {e.region}
                      </p>
                      <h2 className="mt-1 text-lg font-extrabold text-ink">
                        {e.title}
                      </h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        {e.farm_name}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm text-ink">
                        {getExperienceContent(e.id)?.tagline ?? e.description}
                      </p>
                      <ExperienceCardInfo
                        duration={getExperienceContent(e.id)?.duration}
                        next={nextSession(e.id)}
                        loaded={sessionsById.has(e.id)}
                      />
                      <p className="mt-4 text-base font-bold text-ink">
                        {e.fee > 0 ? `${formatPrice(e.fee)}` : "무료"}
                        <span className="ml-1 text-xs font-normal text-ink-muted">
                          1인 · 현장 안내, 결제 없음
                        </span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-card bg-surface p-10 text-center ring-1 ring-line">
              <p className="font-bold text-ink">조건에 맞는 체험이 없어요.</p>
              <Link href="/experiences" className="mt-4 btn btn-primary">
                조건 초기화
              </Link>
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="페이지"
              className="mt-8 flex items-center justify-center gap-3 text-sm"
            >
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="btn btn-secondary">
                  이전
                </Link>
              )}
              <span className="text-ink-muted">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="btn btn-secondary">
                  다음
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}

// 카드 아래쪽 정보: 소요 시간, 다음 회차, 남은 자리 (3자리 이하면 "마감 임박")
function ExperienceCardInfo({
  duration,
  next,
  loaded,
}: {
  duration?: string;
  next?: Session;
  loaded: boolean;
}) {
  return (
    <dl className="mt-3 grid gap-1 text-sm">
      {duration && (
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-ink-muted">소요 시간</dt>
          <dd className="text-ink">{duration}</dd>
        </div>
      )}
      {loaded && (
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-ink-muted">다음 회차</dt>
          <dd className="text-ink">
            {next ? (
              <>
                {formatSessionTime(next.starts_at)}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                    next.remaining <= 3
                      ? "bg-accent-soft text-accent"
                      : "bg-brand-soft text-brand"
                  }`}
                >
                  {next.remaining <= 3
                    ? `마감 임박 · ${next.remaining}자리`
                    : `${next.remaining}자리 남음`}
                </span>
              </>
            ) : (
              "예약 가능한 회차가 없어요"
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}
