"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";
import { SearchIcon } from "@/components/common/Icons";
import type { AdminPromotion } from "@/lib/admin-store";
import { managedPromotions, promotionKindLabels } from "@/lib/admin-promotions";
import { AdminProducts } from "./AdminProducts";
import { useAdminStore } from "./AdminStore";
import { PromotionEditDialog } from "./PromotionEditDialog";

export function AdminPromotions() {
  const store = useAdminStore();
  const [editor, setEditor] = useState<{ item: AdminPromotion | null } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const top = useRef<HTMLFormElement>(null);
  const normalize = (text: string) => text.replace(/\s/g, "").toLowerCase();
  const filtered = managedPromotions(store).filter(
    (item) =>
      (!kind || item.kind === kind) &&
      (!status || String(item.published) === status) &&
      normalize(`${item.title} ${item.label} ${item.description}`).includes(
        normalize(keyword),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const field =
    "min-h-12 rounded-control border border-line bg-white px-4 text-base";
  function goToPage(value: number) {
    setPage(value);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function open(item: AdminPromotion | null, button: HTMLButtonElement) {
    trigger.current = button;
    setEditor({ item });
  }
  return (
    <AdminProducts
      view="promotions"
      description="혜택 · 이벤트를 등록하고 정보를 관리해요."
      headerAction={
        <button
          type="button"
          className="btn btn-primary shrink-0"
          onClick={(event) => open(null, event.currentTarget)}
        >
          + 등록하기
        </button>
      }
      topNotice={
        notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {notice}
            <button
              type="button"
              className="min-h-8 min-w-8"
              aria-label="알림 닫기"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )
      }
    >
      <form
        ref={top}
        className="mt-7 flex scroll-mt-5 flex-wrap gap-3"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setKeyword(query.trim());
          setPage(1);
        }}
      >
        <input
          aria-label="혜택·이벤트 검색어"
          className={`${field} min-w-48 flex-1`}
          placeholder="제목이나 내용으로 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="종류"
          className={field}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(1);
          }}
        >
          <option value="">종류 전체</option>
          {Object.entries(promotionKindLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="노출 상태"
          className={field}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">노출 전체</option>
          <option value="true">공개</option>
          <option value="false">비공개</option>
        </select>
        <button type="submit" className="btn btn-primary gap-2">
          <SearchIcon className="size-5" />
          검색
        </button>
      </form>
      <p className="mt-8 mb-6 font-bold" aria-live="polite">
        혜택 · 이벤트 {filtered.length}개
      </p>
      {filtered.length ? (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filtered
            .slice((currentPage - 1) * 12, currentPage * 12)
            .map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-card border border-line bg-white shadow-sm"
              >
                <div className="relative">
                  <SafeImage
                    src={item.image}
                    alt={item.title}
                    className="aspect-[3/1] w-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">
                      {promotionKindLabels[item.kind]}
                    </span>
                    <span
                      className={
                        item.published ? "text-green-700" : "text-ink-muted"
                      }
                    >
                      {item.published ? "공개" : "비공개"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-brand">
                    {item.label}
                  </p>
                  <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    {item.benefitLabel}
                  </p>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm text-ink-muted">
                    {item.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <Link
                      className="mr-auto py-2 text-sm font-semibold text-brand hover:underline"
                      href={`/promotions/preview/${item.id}`}
                    >
                      고객 화면 미리보기 ↗
                    </Link>
                    <button
                      type="button"
                      className="btn border border-brand text-brand"
                      onClick={(event) => open(item, event.currentTarget)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="btn border border-line text-red-700"
                      onClick={async () => {
                        if (
                          await store.moveToTrash({ kind: "promotion", item })
                        )
                          setNotice(
                            "혜택 · 이벤트가 휴지통으로 이동되었습니다.",
                          );
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      ) : (
        <div className="rounded-card border border-line bg-white py-20 text-center text-ink-muted">
          조건에 맞는 혜택 · 이벤트가 없습니다.
        </div>
      )}
      {filtered.length > 0 && (
        <nav
          aria-label="혜택·이벤트 페이지"
          className="mt-8 flex flex-wrap justify-center gap-1"
        >
          <button
            className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="이전 페이지"
          >
            ‹
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((number) => (
            <button
              key={number}
              aria-current={currentPage === number ? "page" : undefined}
              className={`min-h-11 min-w-11 rounded-control ${number === currentPage ? "bg-brand-soft font-bold text-brand" : "hover:bg-white"}`}
              onClick={() => goToPage(number)}
              aria-label={`${number}페이지`}
            >
              {number}
            </button>
          ))}
          <button
            className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            disabled={currentPage === pages}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="다음 페이지"
          >
            ›
          </button>
        </nav>
      )}
      {editor && (
        <PromotionEditDialog
          item={editor.item}
          onClose={() => {
            setEditor(null);
            trigger.current?.focus();
          }}
          onSave={(item) => {
            store.savePromotion(item);
            setNotice(
              editor.item
                ? "혜택 · 이벤트 정보가 수정되었습니다."
                : "혜택 · 이벤트가 등록되었습니다.",
            );
            setEditor(null);
            setPage(1);
            trigger.current?.focus();
          }}
        />
      )}
    </AdminProducts>
  );
}
