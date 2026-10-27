import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeImage } from "@/components/common/SafeImage";
import { SessionReserve } from "@/components/experiences/SessionReserve";
import { getExperience } from "@/lib/experiences-api";
import { getExperienceAuth } from "@/lib/experiences-auth";
import { FastApiError } from "@/lib/fastapi";
import { getExperienceContent } from "@/lib/experiences-content";
import { formatPrice } from "@/lib/format";
import {
  experienceImageFocus,
  experienceImageSrc,
} from "@/lib/experiences-image";

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
    if (e instanceof FastApiError && e.status === 404) notFound();
    return (
      <p
        role="alert"
        className="rounded-card bg-danger-soft p-4 text-center text-danger"
      >
        {e instanceof FastApiError
          ? e.message
          : "체험 정보를 불러오지 못했어요."}
      </p>
    );
  }

  const auth = await getExperienceAuth().catch(() => null);
  const content = getExperienceContent(experience.id);
  const fee = experience.fee > 0 ? formatPrice(experience.fee) : "무료";
  const facts = [
    { label: "장소", value: experience.region },
    ...(content ? [{ label: "소요 시간", value: content.duration }] : []),
    { label: "참가비(1인)", value: fee },
    { label: "예약 인원", value: "1~10명" },
  ];
  const sections = content
    ? [
        { id: "intro", label: "소개" },
        { id: "points", label: "체험 포인트" },
        { id: "steps", label: "진행 순서" },
        { id: "farm", label: "농가 이야기" },
        { id: "prepare", label: "준비물" },
        { id: "sessions", label: "회차 선택" },
        { id: "faq", label: "자주 묻는 질문" },
      ]
    : [];

  return (
    <article className="max-w-3xl">
      <Link
        href="/experiences"
        className="text-sm text-ink-muted hover:text-brand"
      >
        ← 체험 목록
      </Link>
      <SafeImage
        src={experienceImageSrc(experience.image_path)}
        alt={experience.title}
        className={`mt-3 aspect-[16/9] w-full rounded-card object-cover ${experienceImageFocus(experience.image_path)}`}
        placeholderText="사진 준비 중"
      />
      <header className="mt-5">
        <p className="text-xs font-bold tracking-[0.1em] text-brand">
          {experience.region}
        </p>
        <h1 className="mt-1 text-[1.5rem] font-extrabold text-ink md:text-[1.875rem]">
          {experience.title}
        </h1>
        <p className="mt-1 text-ink-muted">{experience.farm_name}</p>
        {content && (
          <p className="mt-3 text-lg font-bold text-ink">{content.tagline}</p>
        )}
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="rounded-card bg-brand-soft px-4 py-3">
            <dt className="text-xs font-bold text-brand">{f.label}</dt>
            <dd className="mt-1 font-bold text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      <a href="#sessions" className="btn btn-primary mt-5">
        회차 선택하고 예약하기
      </a>

      {sections.length > 0 && (
        <nav
          aria-label="체험 안내 목차"
          className="mt-8 flex flex-wrap gap-2 border-y border-line py-3"
        >
          {sections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="rounded-full px-3 py-1 text-sm text-ink-muted ring-1 ring-line hover:text-brand hover:ring-brand"
            >
              {sec.label}
            </a>
          ))}
        </nav>
      )}

      <section
        className="mt-10 scroll-mt-24"
        id="intro"
        aria-labelledby="intro-title"
      >
        <h2 id="intro-title" className="text-xl font-extrabold text-ink">
          체험 소개
        </h2>
        <p className="mt-3 text-ink">{experience.description}</p>
        {content?.intro.map((para) => (
          <p key={para} className="mt-3 text-ink">
            {para}
          </p>
        ))}
        {content && (
          <div className="mt-5 rounded-card bg-sand p-5">
            <h3 className="font-bold text-ink">이런 분께 추천해요</h3>
            <ul className="mt-3 grid gap-2">
              {content.audience.map((a) => (
                <li key={a} className="flex gap-2 text-ink">
                  <span aria-hidden="true" className="font-bold text-brand">
                    ✓
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {content && (
        <>
          <section
            className="mt-10 scroll-mt-24"
            id="points"
            aria-labelledby="points-title"
          >
            <h2 id="points-title" className="text-xl font-extrabold text-ink">
              체험 포인트
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {content.highlights.map((h, i) => (
                <li
                  key={h.title}
                  className="rounded-card bg-surface p-4 ring-1 ring-line"
                >
                  <p className="text-xs font-bold tracking-[0.1em] text-brand">
                    POINT {i + 1}
                  </p>
                  <h3 className="mt-1 font-bold text-ink">{h.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{h.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="mt-10 scroll-mt-24"
            id="steps"
            aria-labelledby="steps-title"
          >
            <h2 id="steps-title" className="text-xl font-extrabold text-ink">
              이렇게 진행돼요
              <span className="ml-2 text-sm font-normal text-ink-muted">
                총 {content.duration}
              </span>
            </h2>
            <ol className="mt-4 grid gap-3">
              {content.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="flex gap-4 rounded-card bg-surface p-4 ring-1 ring-line"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-ink">
                      {step.title}
                      <span className="ml-2 text-sm font-normal text-ink-muted">
                        {step.time}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="mt-10 scroll-mt-24 rounded-card bg-brand-soft p-5"
            id="farm"
            aria-labelledby="farm-title"
          >
            <h2 id="farm-title" className="text-xl font-extrabold text-ink">
              농가 이야기
            </h2>
            <p className="mt-1 text-sm font-bold text-brand">
              {experience.farm_name} · {experience.region}
            </p>
            <p className="mt-3 text-ink">{content.farmStory}</p>
            <p className="mt-3 text-sm text-ink-muted">
              <span className="font-bold text-ink">모이는 곳 </span>
              {content.meeting}
            </p>
          </section>

          <section
            className="mt-10 grid scroll-mt-24 gap-4 sm:grid-cols-3"
            id="prepare"
            aria-label="포함 사항, 준비물, 가져가는 것"
          >
            {[
              { title: "포함 사항", items: content.included, mark: "✓" },
              { title: "준비물", items: content.bring, mark: "·" },
              { title: "가져가는 것", items: content.takeHome, mark: "·" },
            ].map((box) => (
              <div
                key={box.title}
                className="rounded-card bg-surface p-5 ring-1 ring-line"
              >
                <h2 className="text-lg font-extrabold text-ink">{box.title}</h2>
                <ul className="mt-3 grid gap-2 text-ink">
                  {box.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="font-bold text-brand">
                        {box.mark}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}

      <h2
        id="sessions"
        className="mt-10 scroll-mt-24 text-xl font-extrabold text-ink"
      >
        회차 선택
      </h2>
      <SessionReserve
        experienceId={experience.id}
        sessions={experience.sessions}
        loggedIn={auth !== null}
      />

      {content && (
        <>
          <section
            className="mt-10 scroll-mt-24"
            id="faq"
            aria-labelledby="faq-title"
          >
            <h2 id="faq-title" className="text-xl font-extrabold text-ink">
              자주 묻는 질문
            </h2>
            <div className="mt-4 grid gap-2">
              {content.faq.map((f) => (
                <details
                  key={f.q}
                  className="rounded-card bg-surface p-4 ring-1 ring-line"
                >
                  <summary className="cursor-pointer font-bold text-ink">
                    <span aria-hidden="true" className="mr-1 text-brand">
                      Q.
                    </span>
                    {f.q}
                  </summary>
                  <p className="mt-2 text-sm text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section
            className="mt-10 rounded-card bg-sand p-5"
            aria-labelledby="notes"
          >
            <h2 id="notes" className="text-lg font-extrabold text-ink">
              꼭 확인해 주세요
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-ink">
              {content.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span aria-hidden="true" className="font-bold text-brand">
                    ·
                  </span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              체험 구성, 농가 이야기, 준비물은 시연용 안내예요.
            </p>
          </section>
        </>
      )}
    </article>
  );
}
