// Canonical social/contact identity for Devafusion. Single source of truth
// consumed by SiteFooter, the About page and the Contact page so the same
// URLs and rel="me" identity-verification attribute never drift out of
// sync between the three surfaces.
export type SocialLink = {
  label: string;
  href: string;
  handle: string;
};

export const socialLinks: SocialLink[] = [
  {
    label: "GitHub",
    href: "https://github.com/vaughanh1/devafusion",
    handle: "vaughanh1/devafusion",
  },
  {
    label: "X",
    href: "https://x.com/devafusion",
    handle: "@devafusion",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/vaughan-hodgson/",
    handle: "vaughan-hodgson",
  },
];

export const primaryContactEmail = "hello@devafusion.com";
export const legalContactEmail = "legal@devafusion.com";
