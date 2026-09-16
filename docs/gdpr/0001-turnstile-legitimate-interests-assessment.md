# Legitimate Interests Assessment: Cloudflare Turnstile bot protection

Prepared alongside ADR-0014 (client-level auth hardening). This is a
working document showing the reasoning behind the lawful basis
declared to users on `/legal` for Cloudflare Turnstile - it is not
itself user-facing, but exists so that reasoning is written down and
reviewable, following the ICO's own published three-part test
structure (purpose, necessity, balancing) for relying on legitimate
interests under UK GDPR Article 6(1)(f).

## Processing in scope

Cloudflare Turnstile's bot-detection check, run on `/sign-up`,
`/log-in` and `/forget-password`. The data sent to Cloudflare is the
visitor's IP address and certain browser-environment signals
(collected by Cloudflare's own challenge script); Devafusion does not
receive or store the raw signals itself, only the pass/fail result of
each check.

## 1. Purpose test

**What is the legitimate interest, and whose interest is it?**

Devafusion's registration and log-in endpoints are exposed directly
to the internet with no Web Application Firewall or CDN-level bot
mitigation in front of them (a deliberate cost/architecture decision -
see ADR-0014's Rationale). Automated scripts targeting these endpoints
(credential-stuffing, mass fake-account creation, scripted password-
reset abuse) create real harm: account takeover attempts against
genuine users, database/compute load that this project's Burstable
Postgres tier and modest App Service Plan cannot absorb indefinitely,
and degraded availability for legitimate visitors. The interest is
squarely Devafusion's own (protecting its service and its users' data)
and, transitively, every genuine user's interest in their account not
being targeted by automation. This is a widely recognised legitimate
interest - fraud and abuse prevention is one of the examples the ICO's
own guidance lists as commonly justifying reliance on Article 6(1)(f).

## 2. Necessity test

**Is this processing actually necessary to achieve that purpose, and
is there a less intrusive way?**

- **Rate limiting alone is insufficient**: it throttles volume from a
  single identity/IP, but a low-and-slow or distributed attack (many
  IPs, few requests each) defeats pure rate limiting while still being
  automated. Turnstile detects automation itself, independent of
  request volume.
- **Honeypot fields are obsolete**: any bot sophisticated enough to be
  a real threat to this project already inspects computed CSS/ARIA
  state and skips hidden fields trivially - this is not a meaningful
  mitigation against a genuine threat today.
- **Managed mode, not Invisible mode**: Turnstile's Managed mode only
  escalates to a visible interaction when its background signals are
  ambiguous, and requires no additional disclosure beyond what is
  already given here. Invisible mode was considered and rejected
  specifically because it demands an extra privacy-policy addendum
  reference for no accuracy improvement over Managed mode - a
  disproportionate transparency cost for zero necessity benefit.
- **Client-side device fingerprinting libraries** (e.g. FingerprintJS)
  were considered and rejected: they build a persistent cross-site
  identifier with no clear time-bound purpose, which is itself a
  harder-to-justify processing activity than a single, purpose-bound
  challenge token - trading one compliance risk for a worse one.
- **A custom-built proof-of-work challenge** was considered and
  rejected as speculative engineering: Turnstile's own Managed mode
  already performs an equivalent background check, so hand-rolling a
  second one duplicates effort without closing a real gap.

Turnstile is the least intrusive mechanism identified that actually
achieves the stated purpose.

## 3. Balancing test

**Do the individual's interests, rights, or freedoms override the
legitimate interest identified above?**

- **What is actually collected**: IP address and browser-environment
  signals already necessarily present in any HTTP request (Cloudflare
  does not need Devafusion to hand it anything beyond what a normal
  page load already exposes to any server). In the configuration used
  here (Managed mode, pre-clearance not enabled), Turnstile sets no
  cookie and builds no persistent visitor profile on Devafusion's own
  domain.
- **Reasonable expectation**: a visitor attempting to create an
  account or log in on a site with no other visible bot defence would
  reasonably expect some form of automation check - this is now a
  common, well-understood pattern across the web, not a surprising or
  covert use of their data.
- **No dead end for a genuine user**: Managed mode's escalation path
  (a single checkbox, at most) is a low-friction interaction, not a
  puzzle or a blocking wall - a real visitor who fails the background
  check is never permanently denied access, only asked to confirm
  once.
- **Proportionality**: the volume and sensitivity of data sent
  (IP + ephemeral browser signals, for a single verification call) is
  narrow and directly tied to the stated purpose - it is not repurposed
  for advertising, profiling, or any use beyond the immediate bot
  check.
- **Third-party processor risk**: Cloudflare is a large, established
  processor with a published privacy policy, a UK legal entity and
  Data Protection Officer contact (Cloudflare, Ltd., County Hall,
  Belvedere Road, London SE1 7PB), and a dedicated Turnstile Privacy
  Addendum. This is disclosed to users on `/legal`.

**Conclusion**: the legitimate interest in protecting the account
service from automated abuse is not overridden by the individual's
interests here, given the narrow scope of data involved, the low-
friction nature of the check, and the absence of any persistent
tracking in this configuration. Legitimate interests (Article 6(1)(f))
is an appropriate lawful basis for this processing.

## Review trigger

This assessment should be revisited if: Turnstile's pre-clearance mode
is ever enabled (introduces a cookie, requiring both this document and
`/legal` to be updated first, not after); Turnstile is replaced by a
different provider; or the endpoints it protects expand beyond
`/sign-up/email`, `/sign-in/email` and `/request-password-reset`.
