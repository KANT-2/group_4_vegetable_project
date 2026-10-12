// C 사이트 공통 푸터: A의 디자인 규칙을 유지합니다.
// v2 시안(마켓컬리 기준): 왼쪽 서비스 소개 / 오른쪽 바로가기 → 아래 회색 안내 줄
// 고객센터 전화번호·배송·환불 안내 등 팀이 정하지 않은 정책 문구는 넣지 않았어요.

import Link from "next/link";
import { routes } from "@/lib/routes";
import { LeafIcon } from "./Icons";

export function SiteFooter() {
  const links = [
    { href: routes.story, label: "농가 이야기" },
    { href: `${routes.story}#about`, label: "못난이마켓 소개" },
    { href: routes.recipes, label: "레시피" },
    ...(routes.productList
      ? [{ href: routes.productList, label: "전체 상품" }]
      : []),
  ];
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="container-page grid gap-8 py-10 md:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-2 text-xl font-black text-brand">
            <LeafIcon width={24} height={24} />
            못난이마켓
          </p>
          <p className="mt-2 text-ink-muted">
            버려지는 농산물을 줄이는 가치소비 쇼핑 서비스
          </p>
        </div>
        <nav aria-label="푸터 바로가기">
          <ul className="grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-4 md:grid-cols-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-10 items-center hover:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line bg-sand">
        <p className="container-page py-6 text-xs leading-relaxed text-ink-muted">
          © 2026 싹이난 감자 · 교육용 프로젝트이며 상품과 농가 정보는 가상
          데이터입니다. 글꼴: Pretendard (SIL Open Font License)
        </p>
      </div>
    </footer>
  );
}
