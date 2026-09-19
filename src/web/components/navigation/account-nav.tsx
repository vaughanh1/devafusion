"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const hadSession = useRef(false);

  // This component lives in the root layout, so it is never unmounted
  // across a client-side navigation (log out -> /log-in -> log back
  // in all reuse the same instance) - isLoggingOut would otherwise
  // stay stuck at true forever after a real sign-out, since nothing
  // ever set it back to false. Reset it specifically on the
  // false -> true transition of session presence (a genuine fresh
  // login), not on every render where session is already truthy -
  // that would defeat the loading state mid-sign-out, since session
  // itself briefly stays stale/truthy for a moment before
  // authClient's $sessionSignal listener catches up.
  useEffect(() => {
    if (session && !hadSession.current) {
      setIsLoggingOut(false);
    }
    hadSession.current = !!session;
  }, [session]);

  if (isPending) {
    // Reserves the same footprint as either rendered state so the
    // header doesn't visibly shift once the session resolves.
    return <span className="inline-flex min-h-[var(--touch-target-size)] items-center px-3" />;
  }

  if (!session) {
    const query = pathname === "/" ? "" : `?redirect=${encodeURIComponent(pathname)}`;
    return (
      <Link
        href={`/log-in${query}`}
        className="inline-flex min-h-[var(--touch-target-size)] items-center border border-surface-border px-3 text-sm font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
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
        className="inline-flex min-h-[var(--touch-target-size)] items-center border border-surface-border px-3 text-sm font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Account
      </Link>
      <button
        type="button"
        disabled={isLoggingOut}
        onClick={handleLogOut}
        className="inline-flex min-h-[var(--touch-target-size)] cursor-pointer items-center border border-surface-border px-3 text-sm font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoggingOut ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
