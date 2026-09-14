import Link from "next/link";

import { SocialLinksRow } from "@/components/brand/social-links-row";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { primaryContactEmail } from "@/features/brand/social-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-surface-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <p>
            © {new Date().getFullYear()} Devafusion. Built to explore,
            experiment and learn.
          </p>

          <Link
            href="/legal"
            className="text-sm text-muted underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Privacy &amp; cookies
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <a
            href={`mailto:${primaryContactEmail}`}
            className="text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {primaryContactEmail}
          </a>

          <SocialLinksRow />

          <ThemeSelector />
        </div>
      </div>
    </footer>
  );
}
