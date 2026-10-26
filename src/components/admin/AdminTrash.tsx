"use client";

import { useState } from "react";
import { useAdminStore } from "./AdminStore";
import { AdminProducts } from "./AdminProducts";

const labels = {
  product: "상품",
  recipe: "레시피",
  farm: "농가",
  promotion: "혜택·이벤트",
};
export function AdminTrash() {
  const { trash, restore, permanentlyDelete } = useAdminStore();
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const filtered = trash.filter(
    (entry) => filter === "all" || filter === entry.kind,
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  return (
    <AdminProducts
      view="trash"
      description="삭제한 항목을 확인하고 복원할 수 있습니다."
      topNotice={
        notice && (
          <p
            role="status"
            className="mb-5 rounded-card bg-green-50 p-4 text-sm text-green-800"
          >
            {notice}
          </p>
        )
      }
    >
      <div className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" aria-live="polite">
            휴지통 {filtered.length}개
          </p>
          <label className="inline-flex shrink-0 items-center gap-3 text-sm font-bold">
            <span className="sr-only">분류</span>
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
              className="min-h-12 rounded-control border border-line bg-white px-4"
            >
              <option value="all">전체</option>
              {Object.entries(labels).map(([kind, label]) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-[720px] table-fixed text-center text-sm">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[35%]" />
              <col className="w-[25%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead className="border-b border-line bg-gray-50">
              <tr>
                {["분류", "이름", "삭제 일시", "관리"].map((label) => (
                  <th scope="col" key={label} className="px-5 py-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => (
                <tr
                  key={`${entry.kind}:${entry.item.id}`}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-5 py-4">{labels[entry.kind]}</td>
                  <td className="break-words px-5 py-4 font-semibold">
                    {entry.item.name}
                  </td>
                  <td className="px-5 py-4 text-ink-muted">
                    {new Date(entry.deletedAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!(await restore(entry.kind, entry.item.id)))
                            return;
                          setNotice(
                            `${entry.item.name} 항목이 복원되었습니다.`,
                          );
                        }}
                        className="btn btn-secondary text-brand"
                      >
                        복원
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            await permanentlyDelete(entry.kind, entry.item.id)
                          )
                            setNotice(
                              `${entry.item.name} 항목이 삭제되었습니다.`,
                            );
                        }}
                        className="btn btn-secondary text-danger"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={4} className="p-14 text-center text-ink-muted">
                    휴지통이 비어 있습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <nav
            aria-label="휴지통 페이지"
            className="mt-7 flex flex-wrap justify-center gap-1"
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="이전 페이지"
              className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            >
              ‹
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1).map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-label={`${number}페이지`}
                  aria-current={currentPage === number ? "page" : undefined}
                  className={`min-h-11 min-w-11 rounded-control ${currentPage === number ? "bg-brand-soft font-bold text-brand" : "hover:bg-white"}`}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="다음 페이지"
              className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            >
              ›
            </button>
          </nav>
        )}
      </div>
    </AdminProducts>
  );
}
