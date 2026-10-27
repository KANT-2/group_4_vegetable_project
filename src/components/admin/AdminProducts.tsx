"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";
import type { Product } from "@/types/product";
import { adminSignOut } from "@/actions/admin-auth";
import { adminProductName } from "@/lib/admin-product-fields";
import { CheckboxDropdown } from "./CheckboxDropdown";
import { vegetables } from "@/data/mock/vegetables";
import { VEGETABLE_CATEGORY_LABELS } from "@/types/vegetable";
import type { AdminProduct } from "@/lib/admin-store";
import { useAdminStore } from "./AdminStore";
import { RegisterProduct } from "./RegisterProduct";
import { ProductForm } from "./ProductForm";
import { useUnsavedDialog } from "./useUnsavedDialog";
import { LOW_STOCK } from "@/lib/stock";

const getCategory = (product: AdminProduct) =>
  product.category ?? categoryOf.get(product.vegetableId);

const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const categoryOf = new Map(
  vegetables.map((vegetable) => [vegetable.id, vegetable.category]),
);
const fieldClass =
  "min-h-12 rounded-control border border-line bg-white px-4 text-base";
const regionOf = (product: Product) =>
  product.farmRegion?.trim().split(/\s+/)[0] || "지역 미등록";

export function AdminProducts({
  view = "products",
  children,
  headerAction,
  topNotice,
  description,
}: {
  view?: "products" | "recipes" | "farms" | "promotions" | "reviews" | "trash" | "mypage";
  children?: React.ReactNode;
  headerAction?: React.ReactNode;
  topNotice?: React.ReactNode;
  description?: React.ReactNode;
}) {
  const recipes = view === "recipes";
  const productView = view === "products";
  const titles = {
    products: "상품 관리",
    recipes: "레시피 관리",
    farms: "농가 관리",
    promotions: "혜택 · 이벤트 관리",
    reviews: "리뷰 관리",
    trash: "휴지통",
    mypage: "관리자 마이페이지",
  };
  const menuClass = (selected: boolean) =>
    `relative flex min-h-12 items-center gap-3 overflow-hidden rounded-card px-5 font-bold ${selected ? "bg-brand-soft text-brand before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-r before:bg-brand" : "text-ink-muted hover:bg-sand hover:text-brand"}`;
  const { products, setProducts, trash, moveToTrash } = useAdminStore();
  const reservedIds = trash
    .filter((entry) => entry.kind === "product")
    .map((entry) => entry.item.id);
  const regions = [...new Set(products.map(regionOf))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const discardEdit = useUnsavedDialog(dialog, editing?.id);
  const editButton = useRef<HTMLButtonElement | null>(null);
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const updateHeight = () =>
      shell.current?.style.setProperty(
        "--admin-header-height",
        `${element.getBoundingClientRect().height}px`,
      );
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!mobileOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) mobileMenu.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = overflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [mobileOpen]);
  const normalized = keyword.toLocaleLowerCase().replace(/\s/g, "");
  const filtered = products.filter(
    (product) =>
      `${product.name}${product.id}`
        .toLocaleLowerCase()
        .replace(/\s/g, "")
        .includes(normalized) &&
      (selectedStatuses.length === 0 ||
        selectedStatuses.includes(!product.isActive ? "inactive" : product.stock === 0 ? "soldout" : "active")) &&
      (selectedRegions.length === 0 ||
        selectedRegions.includes(regionOf(product))) &&
      (selectedCategories.length === 0 ||
        selectedCategories.includes(getCategory(product) ?? "")),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size);

  function openEditor(product: AdminProduct, button: HTMLButtonElement) {
    editButton.current = button;
    setEditing(product);
    setNotice("");
    dialog.current?.showModal();
  }

  return (
    <div
      ref={shell}
      className="min-h-screen bg-sand [--admin-header-height:112px]"
    >
      <header
        ref={header}
        className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-2 py-2 md:sticky md:top-0 md:z-30 md:min-h-20 md:gap-4 md:px-8 md:py-4"
      >
        <div className="flex items-center gap-0 md:gap-5">
          <button
            type="button"
            aria-label="관리자 메뉴 열기"
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-menu"
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-control text-ink hover:bg-sand md:hidden"
            onClick={() => {
              mobileMenu.current?.showModal();
              setMobileOpen(true);
            }}
          >
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/admin" aria-label="관리자 상품 관리">
            <Image
              src="/brand/motnani-admin-wordmark.png"
              alt="못난이마켓"
              width={195}
              height={81}
              className="h-auto w-40 sm:w-48"
              priority
            />
          </Link>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center px-1 text-xs font-semibold text-ink-muted hover:text-brand md:hidden"
        >
          고객 화면으로 ↗
        </Link>
        <div className="hidden items-center gap-4 text-sm font-semibold text-ink-muted md:flex">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 hover:text-brand"
          >
            고객 화면으로
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 3h7v7M21 3l-11 11M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
            </svg>
          </Link>
        </div>
      </header>
      <dialog
        ref={mobileMenu}
        id="admin-mobile-menu"
        aria-labelledby="admin-mobile-menu-title"
        onClose={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) mobileMenu.current?.close();
        }}
        className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none overflow-y-auto border-r border-line bg-white p-0 shadow-xl backdrop:bg-black/35"
      >
        <div className="flex min-h-full flex-col p-4">
          <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
            <h2 id="admin-mobile-menu-title" className="px-3 font-bold">
              관리자 메뉴
            </h2>
            <button
              type="button"
              aria-label="관리자 메뉴 닫기"
              className="size-11 rounded-control text-3xl text-ink-muted hover:bg-sand"
              onClick={() => mobileMenu.current?.close()}
            >
              ×
            </button>
          </div>
          <nav aria-label="모바일 관리자 메뉴" className="space-y-2">
            {(
              [
                ["products", "/admin", "상품 관리"],
                ["recipes", "/admin/recipes", "레시피 관리"],
                ["farms", "/admin/farms", "농가 관리"],
                ["promotions", "/admin/promotions", "혜택 · 이벤트 관리"],
                ["reviews", "/admin/reviews", "리뷰 관리"],
                ["trash", "/admin/trash", "휴지통"],
              ] as const
            ).map(([key, href, title]) => (
              <Link
                key={key}
                href={href}
                className={menuClass(view === key)}
                aria-current={view === key ? "page" : undefined}
                onClick={() => mobileMenu.current?.close()}
              >
                {title}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-8">
            <div className="space-y-2 border-t border-line pt-4">
              <Link
                href="/admin/mypage"
                className={menuClass(view === "mypage")}
                aria-current={view === "mypage" ? "page" : undefined}
                onClick={() => mobileMenu.current?.close()}
              >
                마이페이지
              </Link>
              <form action={adminSignOut}>
                <button type="submit" className={`${menuClass(false)} w-full`}>
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </dialog>
      <div className="flex min-h-[calc(100vh-80px)] flex-col md:flex-row">
        <aside className="hidden border-b border-line bg-white p-4 md:sticky md:top-[var(--admin-header-height)] md:flex md:h-[calc(100dvh-var(--admin-header-height))] md:w-56 md:shrink-0 md:flex-col md:self-start md:overflow-y-auto md:border-r md:border-b-0">
          <p className="mb-4 px-3 text-xs font-bold text-ink-muted">
            관리자 메뉴
          </p>
          <nav aria-label="관리자 메뉴" className="space-y-2">
            <Link
              href="/admin"
              aria-current={productView ? "page" : undefined}
              className={menuClass(productView)}
            >
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
                <path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.25l8 4.5" />
              </svg>
              상품 관리
            </Link>
            <Link
              href="/admin/recipes"
              aria-current={recipes ? "page" : undefined}
              className={menuClass(recipes)}
            >
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-2H4V3ZM13 6a3 3 0 0 1 3-3h5v16h-4a4 4 0 0 0-4 2M7 7h3M7 11h3M16 7h2M16 11h2" />
              </svg>
              레시피 관리
            </Link>
            <Link
              href="/admin/farms"
              aria-current={view === "farms" ? "page" : undefined}
              className={menuClass(view === "farms")}
            >
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="m3 10 9-7 9 7v11H3V10ZM9 21v-7h6v7M6 10h12" />
              </svg>
              농가 관리
            </Link>
            <Link
              href="/admin/promotions"
              aria-current={view === "promotions" ? "page" : undefined}
              className={menuClass(view === "promotions")}
            >
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" />
              </svg>
              혜택 · 이벤트 관리
            </Link>
            <Link href="/admin/reviews" aria-current={view === "reviews" ? "page" : undefined} className={menuClass(view === "reviews")}>
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9Z" /><path d="M7 8h10M7 12h7" /></svg>
              리뷰 관리
            </Link>
            <Link
              href="/admin/trash"
              aria-current={view === "trash" ? "page" : undefined}
              className={menuClass(view === "trash")}
            >
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
              </svg>
              휴지통
            </Link>
          </nav>
          <div className="mt-auto space-y-2 border-t border-line pt-4">
            <Link
              href="/admin/mypage"
              aria-current={view === "mypage" ? "page" : undefined}
              className={menuClass(view === "mypage")}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
              마이페이지
            </Link>
            <form action={adminSignOut}>
              <button className={`${menuClass(false)} w-full`}>
                로그아웃
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M9 12h12m-5-5 5 5-5 5" />
                </svg>
              </button>
            </form>
          </div>
        </aside>
        <section className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
          {topNotice}
          {notice && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between gap-3 rounded-card border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="알림 닫기"
                className="min-h-11 min-w-11"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              {" "}
              <h1 className="page-title">{titles[view]}</h1>
              {description && (
                <p className="mt-2 text-ink-muted">{description}</p>
              )}
              {productView && (
                <p className="mt-2 text-ink-muted">
                  상품 정보·재고·판매 여부를 관리해요. 저장하면 고객 화면에 바로 반영돼요.
                </p>
              )}
            </div>
            {!productView && !recipes && headerAction}
            {recipes &&
              (headerAction ?? (
                <button
                  type="button"
                  className="btn btn-primary shrink-0"
                  disabled
                  title="레시피 등록 기능은 준비 중입니다."
                >
                  + 레시피 등록하기
                </button>
              ))}
            {productView && !children && (
              <RegisterProduct
                existingIds={[
                  ...products.map((product) => product.id),
                  ...reservedIds,
                ]}
                onRegister={(product) => {
                  setProducts((previous) => [
                    {
                      id: product.id,
                      name: product.name,
                      unit: product.unit,
                      farmRegion: product.region,
                      price: product.price,
                      originalPrice: product.price,
                      category: product.category,
                      imageUrl: product.imageUrl,
                      isActive: product.status !== "inactive",
                      stock: product.stock,
                      registered: true,
                      vegetableId: product.vegetableId,
                      uglyReason: product.uglyReason,
                      farmName: product.farmName,
                      description: "",
                      isSeasonal: false,
                      isFeatured: false,
                      reviewCount: 0,
                    },
                    ...previous,
                  ]);
                  setQuery("");
                  setKeyword("");
                  setSelectedRegions([]);
                  setSelectedCategories([]);
                  setSelectedStatuses([]);
                  setPage(1);
                  setNotice("상품이 등록되었습니다.");
                }}
              />
            )}
          </div>
          {productView && !children && (
            <>
              <form
                role="search"
                className="mt-6 mb-7 flex flex-wrap gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setKeyword(query.trim());
                  setPage(1);
                }}
              >
                <label htmlFor="admin-search" className="sr-only">
                  상품명 또는 상품 ID 검색
                </label>
                <input
                  id="admin-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="상품명 또는 상품 ID 검색"
                  className={`${fieldClass} min-w-0 flex-1 basis-64`}
                />
                <CheckboxDropdown
                  label="지역별"
                  options={regions.map((region) => ({
                    value: region,
                    label: region,
                  }))}
                  selected={selectedRegions}
                  onChange={(values) => {
                    setSelectedRegions(values);
                    setPage(1);
                  }}
                />
                <CheckboxDropdown
                  label="종류별"
                  options={Object.entries(VEGETABLE_CATEGORY_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  )}
                  selected={selectedCategories}
                  onChange={(values) => {
                    setSelectedCategories(values);
                    setPage(1);
                  }}
                />
                <CheckboxDropdown
                  label="판매 상태"
                  options={[
                    { value: "active", label: "판매 중" },
                    { value: "soldout", label: "품절" },
                    { value: "inactive", label: "판매 중지" },
                  ]}
                  selected={selectedStatuses}
                  onChange={(values) => {
                    setSelectedStatuses(values);
                    setPage(1);
                  }}
                />
                <button className="btn btn-primary">검색</button>
              </form>
              <div className="flex flex-wrap items-start gap-3">
                {(selectedRegions.length > 0 ||
                  selectedCategories.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRegions([]);
                      setSelectedCategories([]);
                      setPage(1);
                    }}
                    className="min-h-12 px-3 text-sm text-ink-muted hover:text-brand"
                  >
                    지역·종류 초기화
                  </button>
                )}
              </div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p aria-live="polite">
                  전체 <strong>{filtered.length}</strong>개 상품
                </p>
                <label className="text-sm text-ink-muted">
                  <span className="sr-only">페이지당 상품 수</span>
                  <select
                    value={size}
                    onChange={(event) => {
                      setSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="min-h-11 bg-transparent px-2"
                  >
                    <option value={10}>10개씩 보기</option>
                    <option value={20}>20개씩 보기</option>
                    <option value={50}>50개씩 보기</option>
                  </select>
                </label>
              </div>
              <div className="overflow-x-auto rounded-card border border-line bg-white">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <caption className="sr-only">관리자 상품 목록</caption>
                  <thead className="border-b border-line bg-gray-50">
                    <tr>
                      {[
                        "상품 ID",
                        "상품명",
                        "용량",
                        "종류",
                        "지역",
                        "가격",
                        "재고",
                        "판매 상태",
                        "관리",
                      ].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-5 py-4 font-semibold text-ink-muted"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-line last:border-0 hover:bg-sand/60"
                      >
                        <td className="max-w-48 break-words px-5 py-5 text-xs text-ink-muted">
                          {product.id}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <SafeImage
                              src={product.imageUrl}
                              alt=""
                              className="size-16 shrink-0 rounded-control object-cover"
                            />
                            <span className="font-semibold">
                              {product.registered
                                ? product.name
                                : adminProductName(product)}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {product.unit}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {getCategory(product)
                            ? VEGETABLE_CATEGORY_LABELS[getCategory(product)!]
                            : "미분류"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {product.farmRegion || "지역 미등록"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-semibold">
                          {money(product.price)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-4 tabular-nums ${product.stock === 0 ? "font-bold text-danger" : product.stock !== undefined && product.stock <= LOW_STOCK ? "font-bold text-orange-700" : ""}`}
                        >
                          {product.stock === undefined
                            ? "-"
                            : `${product.stock.toLocaleString("ko-KR")}개`}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${!product.isActive ? "bg-gray-100 text-gray-600" : product.stock === 0 ? "bg-danger-soft text-danger" : "bg-green-50 text-green-800"}`}
                          >
                            {!product.isActive ? "판매 중지" : product.stock === 0 ? "품절" : "판매 중"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            aria-label={`${product.name} 수정`}
                            onClick={(event) =>
                              openEditor(product, event.currentTarget)
                            }
                            className="min-h-11 whitespace-nowrap rounded-control border border-brand px-4 text-brand hover:bg-brand-soft"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            aria-label={`${product.name} 삭제`}
                            onClick={async () => {
                              if (
                                !(await moveToTrash({
                                  kind: "product",
                                  item: product,
                                }))
                              )
                                return;
                              setNotice("상품이 휴지통으로 이동되었습니다.");
                            }}
                            className="ml-2 min-h-11 whitespace-nowrap rounded-control border border-line px-3 text-danger hover:bg-danger-soft"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!visible.length && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-16 text-center text-ink-muted"
                        >
                          검색 조건에 맞는 상품이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <nav
                aria-label="상품 페이지"
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
                      type="button"
                      key={number}
                      onClick={() => setPage(number)}
                      aria-current={number === currentPage ? "page" : undefined}
                      aria-label={`${number}페이지`}
                      className={`min-h-11 min-w-11 rounded-control ${number === currentPage ? "bg-brand-soft font-bold text-brand" : "hover:bg-white"}`}
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
            </>
          )}
          {children}
        </section>
      </div>
      <dialog
        ref={dialog}
        onCancel={discardEdit.onCancel}
        aria-labelledby="edit-title"
        onClose={() => {
          setEditing(null);
          editButton.current?.focus();
        }}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md border-l border-line bg-white p-6 shadow-xl backdrop:bg-black/20 sm:p-8"
      >
        <div className="mb-7 flex items-center justify-between gap-3">
          <h2 id="edit-title" className="text-2xl font-bold">
            상품 정보 수정
          </h2>
          <button
            type="button"
            aria-label="수정 닫기"
            onClick={discardEdit.requestClose}
            className="min-h-11 min-w-11 text-3xl text-ink-muted"
          >
            ×
          </button>
        </div>
        {editing && (
          <ProductForm
            key={editing.id}
            initial={{
              id: editing.id,
              name: editing.registered
                ? editing.name
                : adminProductName(editing),
              imageUrl: editing.imageUrl,
              unit: editing.unit,
              category: getCategory(editing) ?? "root",
              region: editing.farmRegion ?? "",
              farmName: editing.farmName,
              vegetableId: editing.vegetableId,
              uglyReason: editing.uglyReason,
              price: editing.price,
              status: !editing.isActive ? "inactive" : editing.stock === 0 ? "soldout" : "active",
              stock: editing.stock ?? 100,
            }}
            existingIds={[
              ...products
                .filter((product) => product.id !== editing.id)
                .map((product) => product.id),
              ...reservedIds,
            ]}
            onCancel={discardEdit.requestClose}
            submitLabel="저장"
            onSubmit={(updated) => {
              setProducts((previous) =>
                previous.map((product) =>
                  product.id === editing.id
                    ? {
                        ...product,
                        id: updated.id,
                        name: updated.name,
                        imageUrl: updated.imageUrl,
                        unit: updated.unit,
                        category: updated.category,
                        farmRegion: updated.region,
                        farmName: updated.farmName,
                        vegetableId: updated.vegetableId,
                        uglyReason: updated.uglyReason,
                        price: updated.price,
                        originalPrice: Math.max(
                          product.originalPrice,
                          updated.price,
                        ),
                        isActive: updated.status !== "inactive",
                        stock: updated.stock,
                        registered: true,
                      }
                    : product,
                ),
              );
              setNotice("상품 정보가 수정되었습니다.");
              dialog.current?.close();
            }}
          />
        )}
      </dialog>
    </div>
  );
}
