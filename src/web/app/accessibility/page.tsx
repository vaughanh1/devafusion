import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "What Devafusion's colour theme, text size, and touch-target controls do, how each maps to WCAG 2.2, and an honest account of where this site does and does not yet meet the strictest (AAA) level.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Accessibility
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        What our accessibility controls do, and what they don&apos;t.
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        The footer&apos;s &quot;Accessibility&quot; panel offers three
        independent controls. They are often lumped together as
        &quot;theme&quot; settings, but each targets a different WCAG 2.2
        success criterion and none of them depend on each other.
      </p>

      <div className="mt-14 space-y-6 text-lg leading-8 text-muted">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            The three controls
          </h2>
          <ul className="mt-4 space-y-4">
            <li>
              <strong className="text-foreground">Colour theme</strong>{" "}
              (Obsidian, Editorial, Tactical, or System) changes background,
              text, and accent colours. Every pairing in every theme is
              checked against the real WCAG relative-luminance formula, not
              eyeballed, and clears 7:1 (Level AAA, SC 1.4.6) for body text
              and 3:1 (Level AA, SC 1.4.11) for borders and focus outlines.
              &quot;System&quot; removes the choice entirely and follows
              your browser&apos;s own light/dark setting instead.
            </li>
            <li>
              <strong className="text-foreground">Text size</strong>{" "}
              (Normal, Large, Accessible XL) scales the page&apos;s root
              font size (112.5% / 125%). This exists as a narrow,
              site-controlled top-up for fixed-size UI chrome - it is not a
              replacement for your browser&apos;s own zoom, which already
              satisfies SC 1.4.4 (Resize Text, Level AA) up to 200% and
              which this control does not attempt to duplicate.
            </li>
            <li>
              <strong className="text-foreground">Touch target size</strong>{" "}
              (AA or AAA) changes the minimum clickable size of every
              button and link on the site: 24×24 CSS pixels by default (SC
              2.5.8, Level AA - the widely accepted baseline), or 44×44
              pixels if you opt up to AAA (SC 2.5.5, Level AAA).{" "}
              <strong className="text-foreground">
                This is the only thing the AAA setting changes.
              </strong>{" "}
              It does not affect colour contrast or text size - those are
              the two controls above it.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            AA vs AAA - what the labels actually mean here
          </h2>
          <p className="mt-2">
            WCAG defines three conformance levels: A, AA, and AAA, each
            stricter than the last. This site targets{" "}
            <strong className="text-foreground">
              Level AA as its baseline for every visitor
            </strong>
            , with several individual controls letting you opt up to the
            stricter AAA bar where that is genuinely achievable. &quot;AAA
            (44px)&quot; in the touch-target control is one specific,
            narrow example of that opt-up - it is not a single switch that
            makes the whole site AAA-conformant. No such switch exists,
            because (see below) some AAA criteria conflict directly with
            this site&apos;s security requirements.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Combinations
          </h2>
          <p className="mt-2">
            The three controls are fully independent, so any colour theme
            can be paired with any text size and either touch-target
            setting - 18 combinations in total. If you want the most
            rigorous combination this site currently offers, Tactical
            (pure black/white/yellow) with Accessible XL text and the AAA
            touch-target size comes closest to a &quot;maximum
            accessibility&quot; preset, though there is currently no
            single button that selects all three at once - you would set
            each individually.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Full WCAG 2.2 AAA assessment
          </h2>
          <p className="mt-2">
            The table below lists every AAA-level success criterion we have
            deliberately assessed against this site, and states plainly
            where we meet it, where we don&apos;t, and why. This is not a
            claim of full AAA conformance - it is an honest account,
            reviewed as part of engineering work on this exact page (see
            the{" "}
            <Link href="/log" className="underline hover:text-foreground">
              engineering log
            </Link>
            ).
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-base">
              <caption className="sr-only">
                WCAG 2.2 AAA success criteria assessed against this site
              </caption>
              <thead>
                <tr className="border-b border-surface-border text-left text-sm text-foreground">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Success criterion
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Why
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-surface-border align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    1.4.6 Contrast (Enhanced)
                  </td>
                  <td className="py-3 pr-4">Met, with one exception</td>
                  <td className="py-3">
                    Every named colour theme clears 7:1 for body text,
                    verified against the real relative-luminance formula.
                    The one documented exception is the placeholder text
                    inside native browser-rendered password/email input
                    fields, which this site cannot restyle beyond the
                    browser&apos;s own rendering - the same category of
                    named exception already used for logo/brand-name text
                    under SC 1.4.3.
                  </td>
                </tr>
                <tr className="border-b border-surface-border align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    1.4.8 Visual Presentation
                  </td>
                  <td className="py-3 pr-4">Not offered, deliberate</td>
                  <td className="py-3">
                    This SC asks for a mechanism letting you pick any
                    foreground/background colour, control line length and
                    line-height, and disable text justification. We offer
                    three curated, contrast-verified themes instead of an
                    open colour picker - a deliberate scope decision, not
                    an oversight, and one we may revisit.
                  </td>
                </tr>
                <tr className="border-b border-surface-border align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    2.2.3 No Timing / 2.2.6 Timeouts
                  </td>
                  <td className="py-3 pr-4">Documented exception</td>
                  <td className="py-3">
                    An in-progress sign-in that needs a second factor
                    (an authenticator code or emailed one-time code) expires
                    3 minutes after it starts, with no way to extend it and
                    no advance warning before it does. This is a deliberate
                    anti-fraud control - a long-lived, unfinished sign-in
                    attempt widens the window an attacker who has obtained
                    a stolen password could exploit. If your code expires,
                    you are told to sign in again; nothing you typed is
                    silently lost without that explanation.
                  </td>
                </tr>
                <tr className="border-b border-surface-border align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    2.2.5 Re-authenticating
                  </td>
                  <td className="py-3 pr-4">Documented exception</td>
                  <td className="py-3">
                    If your session expires mid-way through a security
                    action, you are asked to re-enter your password or
                    verification code rather than having it preserved. A
                    password or one-time code is never held in memory
                    longer than the security check that needs it - it is
                    discarded, not preserved for you to resume with, so a
                    session that expires mid-way always requires starting
                    that step again.
                  </td>
                </tr>
                <tr className="border-b border-surface-border align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    2.5.5 Target Size (Enhanced)
                  </td>
                  <td className="py-3 pr-4">Met</td>
                  <td className="py-3">
                    The touch-target control&apos;s AAA setting opts every
                    interactive element up to a 44×44 CSS pixel minimum
                    hit area.
                  </td>
                </tr>
                <tr className="border-b border-surface-border align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    3.3.7 Redundant Entry
                  </td>
                  <td className="py-3 pr-4">Met</td>
                  <td className="py-3">
                    Signing up or resetting your password only ever asks
                    for the new password once, not twice. This is a
                    deliberate choice, not an oversight: asking you to
                    retype the same value is exactly the duplicate-entry
                    burden this AA criterion (new in WCAG 2.2) discourages.
                    Every password field instead has a &quot;Show&quot;
                    toggle so you can check what you typed without
                    retyping it.
                  </td>
                </tr>
                <tr className="border-b border-surface-border align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    3.3.8 Accessible Authentication (Minimum)
                  </td>
                  <td className="py-3 pr-4">Met</td>
                  <td className="py-3">
                    Signing in never requires you to solve a puzzle or
                    memorise something new. You can paste your password,
                    and every password/one-time-code field supports your
                    browser&apos;s or password manager&apos;s own
                    autofill.
                  </td>
                </tr>
                <tr className="align-top">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    3.3.9 Accessible Authentication (Enhanced)
                  </td>
                  <td className="py-3 pr-4">Not met, by design</td>
                  <td className="py-3">
                    This stricter AAA criterion permits no cognitive test
                    at all - not even one with an alternative available.
                    Because a password is itself a memorised secret, no
                    password-based account can satisfy this criterion. A
                    passwordless method (such as a passkey) is the only
                    way to genuinely meet it, and is not yet offered.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            What we have deliberately not built (yet)
          </h2>
          <ul className="mt-4 space-y-3">
            <li>
              A free foreground/background colour picker (SC 1.4.8) -
              deferred in favour of three curated, pre-verified themes.
            </li>
            <li>
              Line-length and line-height controls (also part of SC 1.4.8).
            </li>
            <li>
              A passwordless sign-in method such as a passkey - the only
              route to genuinely meeting SC 3.3.9.
            </li>
            <li>
              A visible countdown warning before an in-progress sign-in
              challenge&apos;s 3-minute window expires (part of SC 2.2.6) -
              the timeout itself has a documented security rationale above,
              but a warning before it fires would be a real, achievable
              improvement we have not yet made.
            </li>
          </ul>
          <p className="mt-4">
            This site does not currently use any moving or animated
            interface elements (only colour/border transitions on hover and
            focus), so a &quot;reduce motion&quot; preference has nothing
            to act on today - noted here as a fact, not a gap.
          </p>
        </div>
      </div>
    </section>
  );
}
