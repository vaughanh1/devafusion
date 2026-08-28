import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & Cookies",
  description:
    "How Devafusion uses cookies and Google Analytics, and the choices available to you.",
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
            This site does not sell or share visitor data with third
            parties beyond Google Analytics, does not run advertising, and
            does not use any tracking cookies other than the analytics
            cookies described above. The accessibility preference cookies
            described above store only your chosen theme and text size and
            are not used for tracking.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">Questions</h2>
          <p className="mt-2">
            For questions about this page, see the{" "}
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
