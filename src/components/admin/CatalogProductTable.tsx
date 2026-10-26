"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductListItem } from "@/types/product";
import { updateCatalogProduct } from "@/actions/catalog-admin";
import { formatPrice } from "@/lib/format";

export function CatalogProductTable({
  products,
}: {
  products: ProductListItem[];
}) {
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  return (
    <>
      {notice && (
        <p
          role="status"
          className="my-4 rounded-card border border-green-200 bg-green-50 p-4 text-green-800"
        >
          {notice}
        </p>
      )}
      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-[650px] text-left text-sm">
          <caption className="sr-only">상품 가격·판매 여부 관리</caption>
          <thead className="border-b border-line bg-gray-50 text-ink-muted">
            <tr>
              {[
                "상품 ID",
                "상품명",
                "정상가",
                "판매가",
                "판매 상태",
                "관리",
              ].map((label) => (
                <th key={label} scope="col" className="px-5 py-4">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-line last:border-0"
              >
                <td className="px-5 py-4 text-xs text-ink-muted">
                  {product.id}
                </td>
                <td className="px-5 py-4 font-semibold">{product.name}</td>
                <td className="px-5 py-4">
                  {formatPrice(product.originalPrice)}
                </td>
                <td className="px-5 py-4 font-bold">
                  {formatPrice(product.price)}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${product.isActive ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-600"}`}
                  >
                    {product.isActive ? "판매 중" : "판매 중지"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    className="btn btn-secondary text-brand"
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      setEditing(product);
                      setError("");
                      setNotice("");
                      dialog.current?.showModal();
                    }}
                  >
                    수정
                  </button>
                </td>
              </tr>
            ))}
            {!products.length && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-ink-muted">
                  조건에 맞는 상품이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClose={() => {
          setEditing(null);
          trigger.current?.focus();
        }}
        aria-labelledby="catalog-edit-title"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-card border border-line bg-white p-6 shadow-xl backdrop:bg-black/30"
      >
        <h2 id="catalog-edit-title" className="text-xl font-bold">
          상품 가격·판매 여부 수정
        </h2>
        {editing && (
          <form
            key={editing.id}
            className="mt-5 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) return;
              const data = new FormData(event.currentTarget);
              setError("");
              startTransition(async () => {
                const result = await updateCatalogProduct({
                  id: editing.id,
                  price: Number(data.get("price")),
                  is_active: data.get("is_active") === "true",
                });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setNotice("상품 정보가 수정되었습니다.");
                dialog.current?.close();
                router.refresh();
              });
            }}
          >
            <p className="font-semibold">{editing.name}</p>
            <label className="field-label">
              판매 가격 (원)
              <input
                autoFocus
                name="price"
                required
                type="number"
                min={1}
                max={editing.originalPrice}
                step={1}
                defaultValue={editing.price}
                className="field mt-2"
              />
            </label>
            <p className="text-sm text-ink-muted">
              정상가 {formatPrice(editing.originalPrice)} 이하로 입력해 주세요.
            </p>
            <label className="field-label">
              판매 상태
              <select
                name="is_active"
                defaultValue={String(editing.isActive)}
                className="field mt-2"
              >
                <option value="true">판매 중</option>
                <option value="false">판매 중지</option>
              </select>
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t border-line pt-5">
              <button
                type="button"
                disabled={pending}
                className="btn btn-secondary"
                onClick={() => dialog.current?.close()}
              >
                취소
              </button>
              <button disabled={pending} className="btn btn-primary">
                {pending ? "저장 중…" : "저장"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
