"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/features/auth/auth-client";

// Session state is resolved client-side via authClient.useSession(),
// not server-side in SiteHeader - a Server Component reading
// headers()/cookies() to determine auth state would force every page
// that renders the header (every page, via app/layout.tsx) into
// dynamic (server-rendered on demand) rendering, destroying this
// site's static generation for its actual content pages just to show
// a login link. The tradeoff is a brief loading state on first paint
// while the session resolves, which is preferable to losing SSG
// site-wide (src/web/AGENTS.md's Server-First, Leaf-Isolated Client
// Boundaries rule - this leaf owns exactly the state that needs it).
export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (isPending) {
    // Reserves the same footprint as either rendered state so the
    // header doesn't visibly shift once the session resolves.
    return <span className="inline-flex min-h-11 items-center px-3" />;
  }

  if (!session) {
    const query = pathname === "/" ? "" : `?redirect=${encodeURIComponent(pathname)}`;
    return (
      <Link
        href={`/log-in${query}`}
        className="inline-flex min-h-11 items-center border border-surface-border px-3 text-sm font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Log in
      </Link>
    );
  }

  async function handleLogOut() {
    setIsLoggingOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="inline-flex min-h-11 items-center border border-surface-border px-3 text-sm font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Account
      </Link>
      <button
        type="button"
        disabled={isLoggingOut}
        onClick={handleLogOut}
        className="inline-flex min-h-11 cursor-pointer items-center border border-surface-border px-3 text-sm font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoggingOut ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
