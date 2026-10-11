// C 공통 헤더: A의 디자인과 실제 개인 상태를 연결합니다.

import Link from "next/link";
import { Suspense } from "react";
import { routes } from "@/lib/routes";
import { LeafIcon } from "./Icons";
import { MobileMenu, type NavLink } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { PersonalMenu } from "./PersonalMenu";

export function SiteHeader() {
  const links: NavLink[] = [
    { href: routes.home, label: "홈" },
    ...(routes.productList
      ? [{ href: routes.productList, label: "전체 상품" }]
      : []),
    { href: routes.recipes, label: "레시피" },
    { href: routes.story, label: "농가 이야기" },
  ];

  return (
    <header className="relative border-b border-line bg-surface">
      <div className="container-page flex min-h-16 items-center justify-between gap-2 py-2">
        <Link
          href={routes.home}
          className="inline-flex min-h-12 shrink-0 items-center gap-2 text-lg font-extrabold text-brand-dark lg:text-xl"
        >
          <LeafIcon width={26} height={26} className="text-brand" />
          못난이마켓
        </Link>

        <Suspense fallback={null}>
          <NavLinks links={links} />
          <div className="flex items-center gap-1">
            <PersonalMenu />
            <MobileMenu links={links} />
          </div>
        </Suspense>
      </div>
    </header>
  );
}
