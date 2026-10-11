// 없는 주소·없는 레시피 id 일 때 보여주는 공통 404 화면
import Link from "next/link";
import { LeafIcon } from "@/components/common/Icons";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="container-page section text-center">
      <LeafIcon width={48} height={48} className="mx-auto text-brand" />
      <h1 className="page-title mt-4">찾을 수 없는 페이지예요</h1>
      <p className="mt-3 text-ink-muted">
        주소가 바뀌었거나 없는 페이지예요. 아래 버튼으로 다시 둘러보세요.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href={routes.home} className="btn btn-primary">
          홈으로
        </Link>
        <Link href={routes.recipes} className="btn btn-secondary">
          레시피 목록 보기
        </Link>
      </div>
    </div>
  );
}
