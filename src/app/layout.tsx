// C 전체 레이아웃: A 화면과 공통 로그인·장바구니 상태를 연결합니다.

import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/common/SiteFooter";
import { SiteHeader } from "@/components/common/SiteHeader";
import { NavigationProvider } from "@/components/common/NavigationProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "못난이마켓", template: "%s | 못난이마켓" },
  description:
    "모양은 조금 달라도 맛과 가치는 그대로. 못난이 농산물과 농가 이야기, 그 농산물로 만드는 레시피를 소개해요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf9f5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-dark focus:px-4 focus:py-3 focus:text-white"
        >
          본문 바로가기
        </a>
        <NavigationProvider>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </NavigationProvider>
      </body>
    </html>
  );
}
