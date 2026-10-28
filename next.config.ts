import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const nextConfig: NextConfig = {
  // LAN 시연 주소에서도 클라이언트 JS/HMR을 받을 수 있도록 이 PC의 IPv4만 허용한다.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap((addresses) =>
    (addresses ?? [])
      .filter((address) => address.family === "IPv4" && !address.internal)
      .map((address) => address.address),
  ),
  // 로컬에서 고객용(3000)과 관리자용(3001) 개발 서버를 동시에 실행할 때
  // 빌드 잠금과 산출물이 충돌하지 않도록 포트별 디렉터리를 사용할 수 있다.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: "https",
            hostname: new URL(supabaseUrl).hostname,
            port: "",
            pathname: "/storage/v1/object/public/market-images/**",
            search: "",
          },
        ]
      : [],
  },
};

export default nextConfig;
