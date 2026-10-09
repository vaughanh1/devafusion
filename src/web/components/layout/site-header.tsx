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
      {/* flex-wrap + min-w-0 on the brand link: at the Accessible XL
          text-size opt-up (globals.css's html[data-a11y-scale=
          "accessible-xl"], 125% root font-size), the brand wordmark +
          Menu + Log in no longer fit one row on a narrow mobile
          viewport. Without flex-wrap the row held its single-line
          layout and instead overflowed the viewport horizontally
          (a real WCAG 2.2 SC 1.4.10 Reflow violation) while squashing
          the last child's text onto two lines ("Log" / "in"). Wrapping
          onto a second row keeps every control at full size and
          legible instead. min-h-16 only sets a floor, not a fixed
          height, so the header grows naturally to fit two rows when
          wrapped. */}
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
