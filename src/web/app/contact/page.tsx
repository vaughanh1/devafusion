import type { Metadata } from "next";
import Link from "next/link";

import { SocialLinksRow } from "@/components/brand/social-links-row";
import { legalContactEmail, primaryContactEmail } from "@/features/brand/social-links";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Devafusion for general enquiries, privacy questions, or to connect on GitHub, X or LinkedIn.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Contact
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Get in touch.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
        Every address below is monitored. Pick whichever fits - general
        enquiries by default, or the dedicated legal address for privacy and
        data questions.
      </p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Email</h2>
          <ul className="mt-3 space-y-2 text-lg leading-8 text-muted">
            <li>
              General enquiries:{" "}
              <a
                href={`mailto:${primaryContactEmail}`}
                className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
              >
                {primaryContactEmail}
              </a>
            </li>
            <li>
              Privacy &amp; legal:{" "}
              <a
                href={`mailto:${legalContactEmail}`}
                className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
              >
                {legalContactEmail}
              </a>
              . See also the{" "}
              <Link
                href="/legal"
                className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
              >
                privacy &amp; cookies page
              </Link>
              .
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">Elsewhere</h2>
          <div className="mt-3">
            <SocialLinksRow variant="labelled" />
          </div>
        </div>
      </div>

      <p className="mt-10 text-lg leading-8 text-muted">
        Curious about the story behind the name and the engineering
        practices this site holds itself to? Read the{" "}
        <Link
          href="/about"
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          About page
        </Link>
        .
      </p>
    </section>
  );
}
