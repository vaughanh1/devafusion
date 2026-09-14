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
            className={
              variant === "labelled"
                ? "flex items-center gap-2 text-sm text-muted underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                : "text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            }
          >
            {variant === "labelled" ? (
              <>
                <span aria-hidden="true">{link.label}</span>
                <span className="text-muted">{link.handle}</span>
              </>
            ) : (
              link.label
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
