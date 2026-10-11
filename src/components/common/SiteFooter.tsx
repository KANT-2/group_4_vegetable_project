// 사이트 공통 푸터 (임시 구현 — 최종 담당은 C)
// 고객센터 전화번호·배송·환불 안내 등 팀이 정하지 않은 정책 문구는 넣지 않았어요.

import { LeafIcon } from "./Icons";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-sand/60">
      <div className="container-page py-8">
        <p className="inline-flex items-center gap-2 text-lg font-extrabold text-brand-dark">
          <LeafIcon width={22} height={22} className="text-brand" />
          못난이마켓
        </p>
        <p className="mt-1 text-ink-muted">
          버려지는 농산물을 줄이는 가치소비 쇼핑 서비스
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          © 2026 Team 못난이 · 교육용 프로젝트이며 상품과 농가 정보는 가상
          데이터입니다.
        </p>
      </div>
    </footer>
  );
}
