"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/experiences-api";

// 브라우저에 저장된 체험용 로그인 상태를 읽어요. 로그인·로그아웃하면 같은 화면의 다른 부분도 같이 바뀌어요.
export function useAuth() {
  const [auth, setAuth] = useState<ReturnType<typeof getToken>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setAuth(getToken());
      setReady(true);
    };
    sync();
    window.addEventListener("experience-auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("experience-auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { auth, ready };
}
