import { SocialPlatformIcon } from "@/components/brand/social-platform-icon";
import { socialLinks } from "@/features/brand/social-links";

type SocialLinksRowProps = {
  variant?: "compact" | "labelled";
};

// rel="me" is the microformat Google and the IndieWeb use to verify
// identity ownership across profiles - it is what lets these links
// reinforce the Organization JSON-LD's sameAs entries instead of reading
// as arbitrary outbound links.
export function SocialLinksRow({ variant = "compact" }: SocialLinksRowProps) {
  return (
    <ul className={variant === "labelled" ? "flex flex-col gap-3" : "flex items-center gap-4"}>
      {socialLinks.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            rel="me noreferrer"
            target="_blank"
            aria-label={link.label}
            // min-h-[var(--touch-target-size)] unconditionally on both variants - "compact"
            // (the footer's icon-only row) previously had no
            // explicit size at all beyond the 16px icon plus gap,
            // well under the 44px CSS-pixel touch-target minimum
            // this project holds every interactive control to.
            // min-w-[var(--touch-target-size)] only on "compact": "labelled" already has a
            // real minimum width from its visible handle text.
            className={
              variant === "labelled"
                ? "flex min-h-[var(--touch-target-size)] items-center gap-2 text-sm text-muted underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                : "flex min-h-[var(--touch-target-size)] min-w-[var(--touch-target-size)] items-center justify-center gap-2 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            }
          >
            <SocialPlatformIcon platform={link.platform} />
            {variant === "labelled" ? (
              <span className="text-muted">{link.handle}</span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
