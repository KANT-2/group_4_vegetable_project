import Link from "next/link";
import {
  catalogToken,
  catalogProduct,
  type CatalogPage,
} from "@/lib/catalog-api";
import { fastApi, FastApiError } from "@/lib/fastapi";
import { CatalogProductTable } from "./CatalogProductTable";

export async function CatalogProductManager({
  params,
}: {
  params: { q?: string; status?: string; page?: string };
}) {
  const token = await catalogToken();
  if (!token)
    return (
      <p role="alert" className="mt-6 text-danger">
        상품 관리는 FastAPI 관리자 계정 로그인이 필요합니다.{" "}
        <Link href="/admin/login" className="underline">
          관리자 로그인
        </Link>
      </p>
    );
  const q = (params.q ?? "").trim().slice(0, 100);
  const status = ["all", "active", "inactive"].includes(params.status ?? "")
    ? params.status!
    : "all";
  const rawPage = Number(params.page ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 100000
      ? rawPage
      : 1;
  const query = new URLSearchParams({
    q,
    status,
    page: String(page),
    size: "20",
  });
  let data: CatalogPage;
  try {
    data = await fastApi<CatalogPage>(
      `/api/v1/catalog/admin/products?${query}`,
      {},
      token,
    );
  } catch (error) {
    return (
      <p role="alert" className="mt-6 text-danger">
        {error instanceof FastApiError
          ? error.message
          : "상품을 불러오지 못했습니다. 잠시 후 새로고침해 주세요."}
      </p>
    );
  }
  const href = (next: number) =>
    `/admin?${new URLSearchParams({ q, status, page: String(next) })}`;
  return (
    <>
      <form action="/admin" className="my-6 flex flex-wrap gap-3" role="search">
        <label className="sr-only" htmlFor="catalog-admin-search">
          상품·농가 검색
        </label>
        <input
          id="catalog-admin-search"
          name="q"
          defaultValue={q}
          placeholder="상품·농가 이름 검색"
          className="field min-w-0 flex-1"
          maxLength={100}
        />
        <label className="sr-only" htmlFor="catalog-admin-status">
          판매 상태
        </label>
        <select
          id="catalog-admin-status"
          name="status"
          defaultValue={status}
          className="rounded-control border border-line bg-white px-4"
        >
          <option value="all">전체 상태</option>
          <option value="active">판매 중</option>
          <option value="inactive">판매 중지</option>
        </select>
        <button className="btn btn-primary">검색</button>
      </form>
      <p className="mb-4 text-sm">
        전체 <strong>{data.total}개</strong> 상품
      </p>
      <CatalogProductTable products={data.items.map(catalogProduct)} />
      {data.total > data.size && (
        <nav
          aria-label="관리자 상품 페이지"
          className="mt-6 flex items-center justify-center gap-4"
        >
          {page > 1 && (
            <Link className="btn btn-secondary" href={href(page - 1)}>
              이전
            </Link>
          )}
          <span>
            {page} / {Math.ceil(data.total / data.size)}
          </span>
          {page * data.size < data.total && (
            <Link className="btn btn-secondary" href={href(page + 1)}>
              다음
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
