// C 공통 헤더: A의 디자인과 실제 개인 상태를 연결합니다.
// v2 시안(마켓컬리 기준): 회원 메뉴 줄 → 로고·검색창·아이콘 줄 → 메뉴 줄
// 휴대폰: 로고·아이콘 → 검색창 → 옆으로 넘기는 메뉴 탭

import Link from "next/link";
import { Suspense } from "react";
import { routes } from "@/lib/routes";
import { HeaderAccount } from "./HeaderAccount";
import { HeaderIcons } from "./HeaderIcons";
import { SearchIcon } from "./Icons";
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

export function SiteHeader() {
  const list = routes.productList;
  // 채소 분류는 상품 목록 화면의 분류 탭에서 골라요.
  const links: NavLink[] = [
    ...(list
      ? [{ href: list, label: "전체 상품", icon: "menu" as const }]
      : []),
    { href: routes.recipes, label: "레시피", icon: "recipe" },
    { href: routes.story, label: "농가 이야기", icon: "farm" },
    { href: "/experiences", label: "체험 예약", icon: "experience" },
    { href: "/promotions", label: "혜택과 이야기", icon: "gift" },
  ];
  const mobileLinks: NavLink[] = [{ href: routes.home, label: "홈" }, ...links];

  return (
    <header className="relative z-30 bg-surface shadow-[0_3px_4px_0_rgb(0_0_0_/_0.07)]">
      {/* 1. 회원 메뉴 줄 (넓은 화면) */}
      <div className="container-page flex justify-end text-xs">
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

      {/* 3. 메뉴 줄 (넓은 화면) */}
      <div className="container-page hidden items-center lg:flex">
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
