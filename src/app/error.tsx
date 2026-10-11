"use client";

// 데이터 조회 실패 등 예상하지 못한 오류가 났을 때 보여주는 공통 오류 화면
// 오류 내용(DB 정보 등)은 화면에 보여주지 않고, 개발자는 콘솔·서버 로그에서 확인해요.

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page section text-center">
      <h1 className="page-title">잠시 문제가 생겼어요</h1>
      <p className="mt-3 text-ink-muted">
        정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요. 계속 같은 문제가
        생기면 팀에 알려 주세요.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn btn-primary">
          다시 시도
        </button>
        <Link href="/" className="btn btn-secondary">
          홈으로
        </Link>
      </div>
    </div>
  );
}
