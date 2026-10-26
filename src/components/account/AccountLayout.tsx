import type { ReactNode } from "react";
import { AccountMenu } from "./AccountMenu";
import { AccountWelcome } from "./AccountWelcome";

export function AccountLayout({
  active,
  title,
  description,
  children,
}: {
  active: "profile" | "orders" | "reviews";
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-sand/70">
      <div className="container-page py-7 md:py-12">
        <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          <aside className="min-w-0 overflow-hidden rounded-xl border border-line/60 bg-surface lg:sticky lg:top-6">
            <AccountWelcome />
            <AccountMenu />
          </aside>
          <div className="min-w-0">
            {active === "profile" && (
              <div id="account-profile-notice" className="scroll-mt-6" />
            )}
            <header className="mb-6 border-b-2 border-ink pb-5">
              <p className="mb-2 text-xs font-semibold tracking-widest text-brand">
                MY MOTNANI
              </p>
              <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
              {description && (
                <p className="mt-2 text-sm text-ink-muted">{description}</p>
              )}
            </header>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
