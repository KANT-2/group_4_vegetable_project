// C 공통 헤더: A의 디자인과 실제 개인 상태를 연결합니다.
// v2 시안(마켓컬리 기준): 회원 메뉴 줄 → 로고·검색창·아이콘 줄 → 카테고리·메뉴 줄
// 휴대폰: 로고·아이콘 → 검색창 → 옆으로 넘기는 메뉴 탭

import Link from "next/link";
import { Suspense } from "react";
import { routes } from "@/lib/routes";
import {
  VEGETABLE_CATEGORY_LABELS,
  type VegetableCategory,
} from "@/types/vegetable";
import { HeaderAccount } from "./HeaderAccount";
import { HeaderIcons } from "./HeaderIcons";
import { MenuIcon, SearchIcon } from "./Icons";
import { MobileMenu, type NavLink } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { BrandLogo } from "./BrandLogo";

function HeaderSearch({ id }: { id: string }) {
  return (
    <form
      action={routes.productList ?? routes.recipes}
      role="search"
      className="relative w-full"
    >
      <label htmlFor={id} className="sr-only">
        상품 검색
      </label>
      <input
        id={id}
        type="search"
        name="q"
        maxLength={30}
        placeholder="채소·상품·농가 이름을 입력해 주세요"
        className="h-12 w-full rounded-[0.375rem] border border-brand bg-surface pl-4 pr-12 text-base placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button
        type="submit"
        aria-label="검색"
        className="absolute right-1 top-1 flex size-10 items-center justify-center text-brand"
      >
        <SearchIcon width={22} height={22} />
      </button>
    </form>
  );
}

// "☰ 카테고리": 마우스를 올리거나 키보드로 들어가면 채소 분류가 펼쳐져요.
function CategoryMenu() {
  if (!routes.productList) return null;
  const categories = Object.entries(VEGETABLE_CATEGORY_LABELS) as [
    VegetableCategory,
    string,
  ][];
  return (
    <div className="group relative">
      <Link
        href={routes.productList}
        className="inline-flex min-h-14 items-center gap-2 pr-6 font-medium hover:text-brand"
        aria-haspopup="true"
      >
        <MenuIcon width={20} height={20} />
        카테고리
      </Link>
      <ul className="invisible absolute left-0 top-full z-40 w-52 border border-line bg-surface py-2 shadow-card group-focus-within:visible group-hover:visible">
        {categories.map(([key, label]) => (
          <li key={key}>
            <Link
              href={`${routes.productList}?category=${key}`}
              className="flex min-h-10 items-center px-4 text-sm hover:bg-sand hover:text-brand"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteHeader() {
  const list = routes.productList;
  const links: NavLink[] = [
    ...(list
      ? [
          { href: list, label: "전체 상품" },
          { href: `${list}?collection=seasonal`, label: "제철" },
          { href: `${list}?collection=bigsale`, label: "특가" },
          { href: `${list}?collection=bulk`, label: "대용량" },
          { href: `${list}?collection=single`, label: "1인 가구" },
        ]
      : []),
    { href: routes.recipes, label: "레시피" },
    { href: routes.story, label: "농가 이야기" },
    { href: "/promotions", label: "혜택과 이야기" },
  ];
  const mobileLinks: NavLink[] = [{ href: routes.home, label: "홈" }, ...links];

  return (
    <header className="relative z-30 bg-surface shadow-[0_3px_4px_0_rgb(0_0_0_/_0.07)]">
      {/* 1. 회원 메뉴 줄 (넓은 화면) */}
      <div className="container-page hidden justify-end text-xs lg:flex">
        <Suspense fallback={null}>
          <HeaderAccount />
        </Suspense>
      </div>

      {/* 2. 로고 · 검색창 · 아이콘 */}
      <div className="container-page flex items-center justify-between gap-3 py-2 lg:pb-5 lg:pt-1">
        <Link
          href={routes.home}
          className="inline-flex min-h-12 shrink-0 items-center gap-2 text-xl font-black tracking-tight text-brand lg:w-[22rem] lg:text-2xl"
        >
          <BrandLogo withMark />
        </Link>
        <div className="hidden w-[25rem] lg:block">
          <HeaderSearch id="header-search" />
        </div>
        <Suspense fallback={null}>
          <div className="flex items-center justify-end lg:w-[22rem]">
            <HeaderIcons />
            <MobileMenu links={mobileLinks} />
          </div>
        </Suspense>
      </div>

      {/* 3. 카테고리 · 메뉴 줄 (넓은 화면) */}
      <div className="container-page hidden items-center lg:flex">
        <CategoryMenu />
        <Suspense fallback={null}>
          <NavLinks links={links} />
        </Suspense>
        <Link
          href={`${routes.story}#reasons`}
          className="ml-4 inline-flex min-h-8 shrink-0 items-center rounded-full border border-line px-4 text-[0.8125rem] text-ink-muted hover:text-brand"
        >
          <span className="font-bold text-brand">못난이</span>&nbsp;선별 기준
        </Link>
      </div>

      {/* 휴대폰: 검색창 → 메뉴 탭 */}
      <div className="container-page pb-1 lg:hidden">
        <HeaderSearch id="header-search-mobile" />
      </div>
      <Suspense fallback={null}>
        <NavLinks links={mobileLinks} variant="mobile" />
      </Suspense>
    </header>
  );
}
