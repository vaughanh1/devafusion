import Link from "next/link";

import { MainNavigation } from "@/components/navigation/main-navigation";

export function SiteHeader() {
  return (
    <header className="border-b border-surface-border">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Devafusion
        </Link>

        <MainNavigation />
      </div>
    </header>
  );
}
