import type { Metadata } from "next";
import Link from "next/link";

import { legalContactEmail } from "@/features/brand/social-links";

export const metadata: Metadata = {
  title: "Privacy & Cookies",
  description:
    "How Devafusion handles account data, cookies, and Google Analytics, and the choices and rights available to you.",
  // See log/page.tsx's identical comment - without this, this page
  // silently inherits layout.tsx's root canonical "/".
  alternates: { canonical: "/legal" },
};

export default function LegalPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Legal
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Privacy & cookies.
      </h1>

      <div className="mt-6 space-y-6 text-lg leading-8 text-muted">
        <p>
          Devafusion is a personal technical laboratory. This page explains
          the only tracking used on this site and the choices you have over
          it.
        </p>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Google Analytics
          </h2>
          <p className="mt-2">
            This site uses Google Analytics 4 to understand how many people
            visit and which pages they read. Analytics is off by default on
            every visit: no analytics cookies are set and no analytics
            requests are sent until you click &quot;Accept&quot; on the
            banner shown at the bottom of the page.
          </p>
          <p className="mt-2">
            If you click &quot;Accept&quot;, Google Analytics cookies are
            set and full visit data (pages viewed, approximate location,
            device type) is recorded. If you click &quot;Reject&quot;, no
            cookies are set and no per-visit data is recorded.
          </p>
          <p className="mt-2">
            Your choice is remembered in your browser&apos;s local storage
            so the banner does not reappear on later visits, and you can
            change your mind at any time by clearing your browser&apos;s
            site data for this domain.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Account data
          </h2>
          <p className="mt-2">
            If you create an account, we collect the name and email address
            you provide, and store your password as an irreversible hash -
            never in a form we or anyone else could read back. We process
            this data to provide the account service you have requested
            (our lawful basis is contract, under UK GDPR Article 6(1)(b)),
            and keep it for as long as your account exists.
          </p>
          <p className="mt-2">
            To confirm you own the email address you signed up with, and to
            let you reset your password if you forget it, we send a
            one-time link to that address using{" "}
            <a
              href="https://learn.microsoft.com/en-us/azure/communication-services/concepts/privacy"
              rel="noreferrer"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Azure Communication Services
            </a>{" "}
            (Microsoft), hosted in the UK for the same reason described
            below under Multi-factor authentication. Until you click the
            verification link, you cannot sign in - this is part of
            providing the account service you requested (Article 6(1)(b)),
            the same lawful basis as the rest of this section. Each link
            expires after 1 hour and is not used for marketing or tracking.
          </p>
          <p className="mt-2">
            Signing in sets a session cookie so the site can recognise you
            as logged in. This cookie is strictly necessary to provide the
            account service you asked for and is exempt from active consent
            under PECR, but we disclose it here regardless: it stores only
            a random session token, is not used for tracking or analytics,
            and is not shared with any third party.
          </p>
          <p className="mt-2">
            You have the right to access, correct, export, or delete your
            account data at any time. Visit{" "}
            <Link href="/account" className="underline hover:text-foreground">
              your account page
            </Link>{" "}
            to download a copy of everything held on your account (UK GDPR
            Article 15) or permanently delete your account (UK GDPR Article
            17) - deletion is immediate and cannot be undone. If you need
            help with either, or want to exercise any other right under UK
            GDPR (rectification, restriction, objection), email{" "}
            <a
              href={`mailto:${legalContactEmail}`}
              className="underline hover:text-foreground"
            >
              {legalContactEmail}
            </a>
            ; we will respond within one month as required by law.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Bot protection (Cloudflare Turnstile)
          </h2>
          <p className="mt-2">
            The sign-up, log-in and forgot-password forms use Cloudflare
            Turnstile to verify you are a real person rather than an
            automated script, since this site has no separate firewall
            in front of it. Turnstile runs a background check (your IP
            address and some browser signals are sent to Cloudflare)
            and, only if that check is inconclusive, may ask you to tick
            a single checkbox - it never shows an image or text puzzle.
            Our lawful basis for this processing is legitimate interests
            (UK GDPR Article 6(1)(f)): protecting the account service
            from automated abuse, which also protects genuine users of
            it. See{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              rel="noreferrer"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Cloudflare&apos;s privacy policy
            </a>{" "}
            (Section 18, Turnstile Privacy Addendum) for what Cloudflare
            itself does with this data; Cloudflare, Ltd. (County Hall,
            Belvedere Road, London SE1 7PB) is its UK entity. In the
            configuration used on this site, Turnstile does not set any
            cookie - if that ever changes (Cloudflare&apos;s
            &quot;pre-clearance&quot; mode, not currently enabled, sets
            a <code>cf_clearance</code> cookie), this page will be
            updated to disclose it before it is switched on.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Multi-factor authentication (MFA)
          </h2>
          <p className="mt-2">
            If you enable a second sign-in factor (an authenticator app or
            an emailed code), we store an encrypted copy of the
            authenticator app secret, a hashed copy of any backup codes
            you generate, and which factors your account requires. Our
            lawful basis for this processing is our legitimate interest
            in the security of the account service (UK GDPR Article
            6(1)(f)) and, where applicable, our legal obligation to
            protect personal data (Article 6(1)(c)). We keep this data
            for as long as your account exists, or until you turn the
            feature off, whichever is sooner.
          </p>
          <p className="mt-2">
            If you choose to receive a code by email, we use{" "}
            <a
              href="https://learn.microsoft.com/en-us/azure/communication-services/concepts/privacy"
              rel="noreferrer"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Azure Communication Services
            </a>{" "}
            (Microsoft) to send it, hosted in the UK. We chose this
            provider specifically because it lets us keep this data
            within the UK, rather than a provider that would move it
            outside the UK. The email contains only a one-time code and
            expires after three minutes; it is not used for marketing or
            tracking.
          </p>
          <p className="mt-2">
            If you choose to trust a device for 30 days, we set an
            additional strictly necessary cookie containing a random
            token - not a hardware fingerprint or any identifying
            information about your device - so we can recognise that
            browser without asking for a second factor again during that
            window. This is exempt from active consent under PECR (it is
            required to provide the security feature you asked for), but
            we disclose it here regardless. In-progress sign-in attempts
            (which factor you have completed so far) are held in server
            memory for at most three minutes and are never written to a
            database, per the data minimisation principle (UK GDPR
            Article 5(1)(c)).
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Accessibility theme preference
          </h2>
          <p className="mt-2">
            If you choose a colour theme or text size from the controls in
            the site footer, that choice is saved in two strictly necessary
            cookies (<code>devafusion-a11y-theme</code> and{" "}
            <code>devafusion-a11y-scale</code>) so the site can apply it
            immediately on your next visit, before the page renders. These
            cookies store only your chosen preference value, are not used
            for tracking or analytics, and are not shared with any third
            party. Selecting &quot;System&quot; removes the theme cookie and
            returns the site to following your browser&apos;s own light or
            dark mode setting.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            What is not collected
          </h2>
          <p className="mt-2">
            This site does not sell or share your data with third parties
            beyond Google Analytics, Cloudflare Turnstile, and Azure
            Communication Services (used for every account&apos;s
            verification and password-reset emails, and additionally
            for email-based MFA if you enable it), all described above.
            It does not run advertising and does not
            use any tracking cookies other than the analytics cookies
            described above. The accessibility preference, session, and
            trusted-device cookies described above store only your
            chosen theme, text size, session token, or MFA trust status,
            and are not used for tracking.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">Questions</h2>
          <p className="mt-2">
            For privacy or data questions, email{" "}
            <a
              href={`mailto:${legalContactEmail}`}
              className="underline hover:text-foreground"
            >
              {legalContactEmail}
            </a>{" "}
            or see the{" "}
            <Link href="/contact" className="underline hover:text-foreground">
              contact page
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
