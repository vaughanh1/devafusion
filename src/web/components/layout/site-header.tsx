import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { MainNavigation } from "@/components/navigation/main-navigation";

export function SiteHeader() {
  return (
    <header className="border-b border-surface-border">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <BrandMark />
        </Link>

        <MainNavigation />
      </div>
    </header>
  );
}
