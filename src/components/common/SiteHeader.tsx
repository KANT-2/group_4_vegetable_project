// 사이트 공통 헤더 (임시 구현 — 최종 담당은 C)
// A 화면을 실행하는 데 필요한 로고와 메뉴만 두었어요. 검색·장바구니·로그인 같은 아직 동작하지 않는
// 기능은 일부러 넣지 않았어요. C가 개인 메뉴(장바구니·마이페이지)를 이 파일에 이어서 붙여 주세요.

import Link from "next/link";
import { Suspense } from "react";
import { routes } from "@/lib/routes";
import { LeafIcon } from "./Icons";
import { MobileMenu, type NavLink } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

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
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href={routes.home}
          className="inline-flex min-h-12 items-center gap-2 text-xl font-extrabold text-brand-dark"
        >
          <LeafIcon width={26} height={26} className="text-brand" />
          못난이마켓
        </Link>

        <Suspense fallback={null}>
          <NavLinks links={links} />
          <MobileMenu links={links} />
        </Suspense>
      </div>
    </header>
  );
}
