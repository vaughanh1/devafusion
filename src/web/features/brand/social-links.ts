// Canonical social/contact identity for Devafusion. Single source of truth
// consumed by SiteFooter, the About page and the Contact page so the same
// URLs and rel="me" identity-verification attribute never drift out of
// sync between the three surfaces.
export type SocialPlatform = "github" | "bluesky" | "x" | "linkedin";

export type SocialLink = {
  label: string;
  href: string;
  handle: string;
  platform: SocialPlatform;
};

export const socialLinks: SocialLink[] = [
  {
    label: "GitHub",
    href: "https://github.com/vaughanh1/devafusion",
    handle: "vaughanh1/devafusion",
    platform: "github",
  },
  {
    label: "Bluesky",
    href: "https://bsky.app/profile/devafusion.net",
    handle: "@devafusion.net",
    platform: "bluesky",
  },
  {
    label: "X",
    href: "https://x.com/devafusion",
    handle: "@devafusion",
    platform: "x",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/vaughan-hodgson/",
    handle: "vaughan-hodgson",
    platform: "linkedin",
  },
];

export const primaryContactEmail = "hello@devafusion.com";
export const legalContactEmail = "legal@devafusion.com";
