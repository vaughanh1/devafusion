import { primaryContactEmail, socialLinks } from "@/features/brand/social-links";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://devafusion.net";

// Organization JSON-LD, rendered once in the root layout. The sameAs array
// is what lets Google's Knowledge Graph verify the GitHub/X/LinkedIn links
// rendered elsewhere on the site (SiteFooter, /about, /contact) actually
// belong to this same entity, provided those links also carry rel="me"
// (see components/brand/social-links-row.tsx).
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Devafusion",
    url: baseUrl,
    logo: `${baseUrl}/icon.svg`,
    email: primaryContactEmail,
    sameAs: socialLinks.map((link) => link.href),
  };

  // Static, non-user-controlled JSON-LD payload - safe to inject directly.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
