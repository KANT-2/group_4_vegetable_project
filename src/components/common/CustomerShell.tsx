"use client";

import { usePathname } from "next/navigation";
import { NavigationProvider } from "./NavigationProvider";

export function CustomerShell({
  children,
  header,
  footer,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <main id="main" className="flex-1">
        {children}
      </main>
    );
  }
  return (
    <NavigationProvider>
      {header}
      <main id="main" className="flex-1">
        {children}
      </main>
      {footer}
    </NavigationProvider>
  );
}
