import type { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { SiteHeader } from "./SiteHeader";

export type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</div>
      <MobileNav />
    </div>
  );
}
