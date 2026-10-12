// 상품 검색창: 자바스크립트 없이도 동작하는 GET 폼 → /products?q=감자
export default function ProductSearch({ q }: { q?: string }) {
  return (
    <form action="/products" role="search" className="relative">
      <label htmlFor="product-search" className="sr-only">
        상품 검색
      </label>
      <input
        id="product-search"
        type="search"
        name="q"
        defaultValue={q}
        maxLength={30}
        placeholder="채소·상품·농가 이름으로 찾기"
        className="h-12 w-full rounded-full bg-surface pl-5 pr-14 text-sm text-ink ring-1 ring-line placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
      />
      <button
        type="submit"
        aria-label="검색"
        className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-full text-ink-muted hover:text-brand-dark"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
