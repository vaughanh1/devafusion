import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { AccountNav } from "@/components/navigation/account-nav";
import { MainNavigation } from "@/components/navigation/main-navigation";

// Stays a plain, synchronous Server Component - AccountNav resolves
// session state client-side precisely so this file never touches
// headers()/cookies() and every page keeps its static rendering (see
// account-nav.tsx for the full rationale).
export function SiteHeader() {
  return (
    <header className="border-b border-surface-border">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <BrandMark />
        </Link>

        <div className="flex items-center gap-4">
          <MainNavigation />
          <AccountNav />
        </div>
      </div>
    </header>
  );
}
