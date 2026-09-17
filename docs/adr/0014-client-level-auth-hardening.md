# Client-level auth hardening: rate limiting, bot protection, GDPR transparency (no WAF/Front Door)

Devafusion's registration/login/account UI (ADR-0012, the registration-
and-login-ui slice) is now live with zero hardening beyond Better
Auth's own defaults, and this project deliberately has no Web
Application Firewall or CDN (Azure Front Door, Application Gateway) in
front of the App Service - a cost decision, not an oversight. This ADR
covers the client/application-level hardening chosen instead, plus the
UK GDPR transparency gap found and closed on `/sign-up` and `/log-in`.

## Status
Accepted

## Rationale

### Why no WAF/Front Door
Azure Front Door Premium (the tier with managed WAF rules) and
Application Gateway both carry a real fixed monthly cost that is
disproportionate to this project's current traffic and its established
cost-discipline pattern (Burstable Postgres, Free-tier Automation,
explicit budget circuit breaker - ADR-0010). The application itself
must therefore be the enforcement point. **Considered but cost-
prohibitive, named for showcase completeness**: Cloudflare Enterprise
Bot Management, Akamai Bot Manager, and DataDome are all real,
higher-tier commercial products that would subsume several of the
mitigations below (managed WAF + bot scoring + rate limiting in one
edge layer) - not adopted here purely on cost/traffic-volume grounds,
not because they are technically unsuitable.

### True client IP and X-Forwarded-For spoofing
Read directly against the installed `better-auth@^1.7.5` /
`@better-auth/core` source (`utils/ip.ts`): Better Auth's `getIP` does
**not** naively trust the first or last comma-separated
`X-Forwarded-For` token. With no `trustedProxies` configured, it only
trusts a header containing exactly one value; a multi-value chain (a
bot appending a second fabricated hop) returns `null` and falls through
to a shared "no trusted IP" bucket rather than being misattributed.
`trustedProxies` (which walks a forwarded chain past known-proxy hops)
was evaluated and left unset: Azure App Service's public multitenant
front-end has no small, stable, documented CIDR range to trust -
Microsoft publishes only the large, dynamic `AzureCloud` service tag,
unusable as an allowlist. This means a bot sending a single spoofed
`X-Forwarded-For` value (e.g. `1.1.1.1`) *is* trusted at face value by
this logic - there is no way to distinguish that from a genuine single-
hop client using this header alone. This gap is deliberately covered by
Turnstile (a network-level signal, not header-derived) and the
stateless timing heuristic below, not by IP header configuration - see
`auth.ts`'s `advanced.ipAddress` comment. Note also (found while
writing `features/auth/__tests__/client-ip.test.ts`): `getIP` has its
own documented dev-convenience fallback that returns a fixed localhost
value instead of `null` whenever `NODE_ENV` is `test` or
`development` - the `NO_TRUSTED_CLIENT_IP` sentinel in
`features/auth/client-ip.ts` is therefore only actually reached in
production (Azure App Service's Node.js runtime sets
`NODE_ENV=production` by default).

### Rate limiting
Better Auth's own `rateLimit` plugin, enabled in every environment
(it defaults to disabled outside production), `storage: "database"`
against a CLI-generated `rateLimit` table (`npx auth@latest generate`,
merged into `db/schema.ts` per the same discipline ADR-0012
established). In-memory storage was rejected: this is a single-
instance App Service that restarts/redeploys, and an in-memory counter
would silently reset on every one. Better Auth's own documented caveat
- "server-side requests made using `auth.api` aren't affected by rate
limiting... only client-initiated requests through its router" - means
routes calling `auth.api.getSession` directly
(`/api/auth/two-factor/verify`, `/api/account/export`) are **not**
covered by this plugin, so a self-built limiter
(`features/auth/rate-limit.ts`) covers that gap, reusing the same
`rate_limit` table and the same `${clientIp}|${path}` key shape
Better Auth's own `createRateLimitKey` uses, via a single atomic
`UPDATE ... RETURNING` (no read-then-write race).

### Cloudflare Turnstile (bot protection)
Added as `auth.ts`'s `captcha` plugin, provider `cloudflare-turnstile`,
**Managed mode** (not Invisible mode - Invisible requires referencing
Cloudflare's Turnstile Privacy Addendum in this project's own privacy
policy for no accuracy benefit, since Managed mode already runs the
same background JS-challenge/proof-of-work/browser-attestation checks
and only escalates to a visible checkbox when ambiguous). Default
endpoints (`/sign-up/email`, `/sign-in/email`, `/request-password-
reset`) used unchanged. A free Cloudflare account (just to register the
widget and obtain a sitekey/secretKey pair) is accepted as a new
external dependency - no DNS/CDN migration to Cloudflare. See
`docs/gdpr/0001-turnstile-legitimate-interests-assessment.md` for the
full Article 6(1)(f) basis, and `/legal`'s new "Bot protection" section
for the user-facing disclosure.

**Considered and rejected alongside Turnstile**:
- Honeypot fields - obsolete; modern scraping frameworks trivially
  detect and skip hidden/`display:none` fields via computed-style
  inspection.
- Client-side device fingerprinting (e.g. FingerprintJS) - builds a
  persistent cross-site identifier with no clear time-bound purpose,
  itself a harder UK GDPR/PECR justification than a single purpose-
  bound challenge token.
- A hand-rolled proof-of-work challenge - Turnstile's Managed mode
  already performs an equivalent background check; duplicating it is
  speculative engineering with no gap it closes.

### Stateless timing heuristic (`features/auth/form-timing-token.ts`)
A signed render timestamp, HMAC'd with a new Key Vault secret
(`form-timing-token-secret-devafusion`), embedded as a hidden field on
`/sign-up`, `/log-in` and `/forget-password`, verified server-side via
`auth.ts`'s `hooks.before` (runs before Better Auth's own per-endpoint
zod body-stripping - confirmed by reading `better-call`'s
`dispatch.mjs`/`context.mjs` directly, so the raw field survives to the
hook). Rejects a request submitted implausibly fast (< 1.2s) or against
a stale token (> 30 minutes). Chosen over a server-issued nonce stored
in the database (Option B - rejected: adds DB reads/writes to a flow
that doesn't need them) specifically because it costs nothing beyond
the HMAC computation and gives an independent, self-hosted second
signal alongside Turnstile - if Turnstile ever had an outage or were
defeated some other way, this check still catches the far more common
case of a bot skipping the browser and POSTing directly.

### PgBouncer - deferred, not adopted
Evaluated three paths and adopted none of them in this slice:
- **Azure's built-in managed PgBouncer (:6432)** requires a General
  Purpose or Memory Optimized compute tier (confirmed directly against
  Microsoft's own PgBouncer documentation) - this project runs
  Burstable B1ms (ADR-0010), and upgrading purely for PgBouncer
  contradicts that ADR's cost rationale.
- **Self-hosted PgBouncer on Azure Container Instances** is not
  "pennies" as sometimes claimed - a minimal always-on 0.5 vCPU/0.5 GB
  container runs roughly $15-20/month at Azure's published per-second
  billing, comparable to this project's entire Postgres line item, and
  requires either App Service VNet integration + private ACI networking
  (real new infrastructure) or a public ACI IP (a second internet-
  facing surface to defend - directly working against the reason this
  ADR exists).
- **A free App Service sidecar container running PgBouncer** is
  genuinely free (runs on the existing App Service Plan's compute, no
  extra billing meter) but requires the main app to already be a
  **custom Linux container image** - this project currently runs the
  built-in Node.js runtime stack (`application_stack { node_version =
  "24-lts" }`), so this is gated behind containerizing the app first, a
  real prerequisite and a separate decision, not a quick add.


**Immediate, zero-cost mitigation instead**: explicit `pg.Pool` bounds
(`max: 10`, `idleTimeoutMillis`, `connectionTimeoutMillis`) in
`db/client.ts`, so this single always-on-false instance can never
exhaust B1ms's own connection ceiling by itself.

**Revisit trigger**: an observed connection-pressure metric against the
live server, not a guess; or a future decision to containerize the app
for other reasons (e.g. an OTel collector sidecar), which would make the
free sidecar path immediately available.

### Access Restrictions - not applicable
Evaluated for both the main app and the SCM/Kudu site, adopted for
neither:
- **Main app**: this is a public site with open self-service
  registration - an IP allow/deny list would block legitimate visitors,
  not bots (Access Restrictions has no rate-limiting concept, only
  allow/deny).
- **SCM/Kudu site**: initially considered as "deny by default" since it
  has no legitimate public visitor, but confirmed directly against
  Microsoft's `AzureWebApp@1` task documentation that its `zipDeploy`
  method (used by `pipelines/cd/web.yml`) deploys through that exact
  SCM endpoint, and neither that task's docs nor Access Restrictions'
  own documentation lists a stable IP range or service tag for Azure
  DevOps's ephemeral hosted agents - the identical problem already
  identified for `trustedProxies` above. Denying SCM access with no
  viable allowlist would break every future CD deployment.


### Turnstile theme parity with the Accessibility Theme Engine
`TurnstileWidget` reads the same `devafusion-a11y-theme` cookie
`ThemeSelector` writes (via the identical `useSyncExternalStore` +
synthetic `"storage"`-event pattern already used by `theme-selector.tsx`
and `cookie-banner.tsx`) and maps this site's three named profiles to
Turnstile's own `light`/`dark`/`auto` vocabulary: `obsidian` and
`tactical` (both dark backgrounds per `globals.css`) resolve to
`dark`; `editorial` (light background) resolves to `light`; no cookie
set (the "System" default) resolves to `auto`, matching the site's own
unset-theme behaviour of following `prefers-color-scheme`. Turnstile's
public widget API exposes only these three values - there is no
equivalent of a fourth custom palette, so `tactical`'s high-contrast
profile still only gets Turnstile's stock `dark` chrome, not a true
tactical-matched render. This is a documented, accepted limitation of
Turnstile's API surface, not an oversight. Turnstile's `render()` has
no live theme-update API, so a mid-session theme switch tears down and
re-renders the widget (restarting any in-progress challenge) - an
accepted trade-off given theme switches mid-form-fill should be rare.

### Turnstile mobile responsiveness and appearance
The widget originally omitted Turnstile's `size` option, defaulting to
`"normal"` - a fixed ~300px width that can overflow a narrow mobile
viewport or sit awkwardly inside this form's fluid `max-w-md`
container, unlike every other field in the form. Fixed by explicitly
setting `size: "flexible"`, Cloudflare's own documented responsive
mode, so the widget fills its container's width the same way the
email/password/name fields already do. Also explicitly set
`appearance: "interaction-only"` rather than accepting Cloudflare's
own default (`"always"`, which renders widget UI visibly from page
load regardless of whether an interactive challenge is ever needed) -
this keeps the form visually clean for the likely-common silent-pass
case, showing UI only when Managed mode genuinely escalates to a
checkbox. Confirmed against Cloudflare's own docs that `appearance`
only controls visibility, not whether the success `callback` fires, so
this has no effect on the existing "disable submit until a token is
received" logic in each form.

### Three live-deployment bugs found post-merge and fixed
The initial deployment of this ADR's Turnstile work shipped three real
bugs, all confirmed on the live site's own browser console (not
theoretical):

- **`NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set - Turnstile widget
  cannot render.`** Terraform wires this into `web.tf`'s
  `app_settings` (a runtime App Service setting), but
  `pipelines/ci/web.yml`'s Build stage runs `next build` before any
  deployment or Key Vault access happens, and `TurnstileWidget` is a
  Client Component - `NEXT_PUBLIC_*` values it reads must be inlined
  into the client bundle *at that build step*, not supplied at
  runtime. Empirically confirmed by inspecting the actual compiled
  Turbopack output: with the value absent, `sitekey` compiles to a
  live `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` property lookup
  guarded by an `if (!sitekey)` branch; with the value present as a
  real shell environment variable at build time, it compiles to the
  literal string and the guard branch is dead-code-eliminated
  entirely. Also empirically confirmed that `.env.local` alone did
  **not** reliably reproduce this inlining in this Next.js 16.3.5 +
  Turbopack setup, even though the file was present and correctly
  named - only a genuine process environment variable at `next build`
  time worked. Fixed by adding an `AzureKeyVault@2` step to CI's Build
  stage (fetching `turnstile-site-key-devafusion`) and setting
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on the `env:` block of the build
  script step immediately after; the same fix was applied to the
  `E2ETests` and `VisualRegression` jobs' own independent `npm run
  build` steps (using Cloudflare's dummy sitekey, not the real one),
  since CD's `Web` stage does `checkout: none` and only deploys the
  artifact CI already built - there is no second build step to fix on
  the deployment side.
- **CSP blocking GA4's actual collect beacon.** The originally-shipped
  `connect-src` allowlisted `www.google-analytics.com`, but GA4's
  `gtag.js` sends its real beacon to a region-prefixed subdomain
  (`region1.google-analytics.com`, confirmed directly from a live
  browser console CSP violation) that the bare `www.` host never
  covers. Fixed by switching to the `*.google-analytics.com` wildcard,
  which CSP source-list syntax matches against any subdomain.
- **`@next/third-parties: GA has not been initialized` console
  warning, GA4 silently never loading.** The same build-time-inlining
  bug as the Turnstile sitekey above, on `NEXT_PUBLIC_GA_ID` instead.
  `google-analytics.tsx` (the wrapper around `@next/third-parties`'s
  `GoogleAnalytics`) has no `"use client"` directive, which was
  wrongly assumed to mean it only ever runs on the server against the
  App Service's own runtime `app_settings` value - it does run on the
  server, but the module is still part of the build graph `next
  build` compiles, and Next.js's `getDefineEnv()` (in
  `node_modules/next/dist/build/define-env.js`) spreads every
  `NEXT_PUBLIC_*` variable into **both** the server and client
  compiler defines with no `isClient` guard around that spread.
  Empirically confirmed the same way as the sitekey bug: building
  locally with `NEXT_PUBLIC_GA_ID` unset produced a server chunk with
  no trace of the value; building with a dummy value set as a real
  shell environment variable produced a server chunk with that exact
  literal string inlined. Fixed by extending the same `AzureKeyVault@2`
  step added for the sitekey bug to also fetch
  `google-analytics-ga4-devafusion`, and setting `NEXT_PUBLIC_GA_ID`
  on `BuildWeb`'s build step alongside the existing sitekey variable.
  `E2ETests`'s build step deliberately leaves it unset (no real or
  dummy GA4 traffic should originate from a CI-run Playwright suite);
  `VisualRegression`'s build step already left it unset by default.
  This also retroactively corrects `ga4-analytics-with-consent-mode`'s
  own log entry, which had asserted the opposite (that a Server
  Component's runtime `app_settings` value would be enough) - that
  assumption was never actually tested against a real build.

### Turnstile E2E coverage
Added `tests-e2e/sign-up.spec.ts` exercising the real `TurnstileWidget`
render, using Cloudflare's own documented dummy sitekey/secretKey pair
(`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`,
the published "always passes" fixture, explicitly named by
Cloudflare's own testing docs as covering Playwright specifically -
real Turnstile challenges detect automated browsers as bots). Wired
into `playwright.config.ts`'s `webServer.env` rather than mocking
`TurnstileWidget` (as the unit suite already does), since a mock would
never catch a real wiring regression between the client's `render()`
call and the server's `captcha` plugin. The account-creation half of
this spec is gated behind `TEST_DB_ACTIONS`
(`src/web/__tests__/AGENTS.md`'s documented toggle) - `pipelines/ci/
web.yml`'s `E2ETests` job has no PostgreSQL sandbox wired up yet, so
that path is skipped by default rather than left to fail CI. Running
this spec for real (not just reasoning about it) caught two genuine
bugs: a stale local dev server masking `FORM_TIMING_TOKEN_SECRET`
being unset, and a Playwright `getByLabel("Password")` strict-mode
violation against `PasswordField`'s "Show password" toggle button
(Playwright's `getByLabel` substring-matches by default) - fixed with
`{ exact: true }`.

### Password visibility toggle
Added a shared `PasswordField` component (used by `SignUpForm`,
`LogInForm`, and `ResetPasswordForm`) with a show/hide toggle button,
matching the UX affordance already present on Cloudflare's own
dashboard sign-up form. Strictly out of this ADR's original security/
GDPR scope, but added in the same pass since these exact three forms
were already being touched for the Turnstile widget - not a separate
slice. `DeleteAccountForm` (from the prior registration-and-login-ui
slice) was deliberately left untouched, since it falls outside this
slice's actual scope.

### Minimal, Turnstile-scoped Content-Security-Policy
Added a first-ever CSP header (`next.config.ts`'s `headers()`),
deliberately narrow rather than a full CSP hardening pass: only
`script-src`/`frame-src`/`connect-src` are set, scoped to
`challenges.cloudflare.com` (Turnstile) plus the already-present
`googletagmanager.com`/`google-analytics.com` origins
(`components/analytics/google-analytics.tsx`'s `@next/third-parties`
`GoogleAnalytics` component) so this change does not silently break
existing analytics. `script-src` retains `'unsafe-inline'`: this app
has two real inline scripts today (the Organization JSON-LD in
`components/seo/organization-schema.tsx`, and the pre-hydration
accessibility theme flash-prevention script in
`components/theme/theme-flash-guard.tsx`, `src/web/AGENTS.md`'s
Accessibility Theme Engine section) - dropping `'unsafe-inline'`
without a nonce-based CSP would silently break the flash-prevention
script (a real, visible regression) and is a separate, larger effort.
No `default-src` is set, since that would fall back to blocking every
directive not explicitly enumerated here. **This CSP addition must be
manually verified against a real deployed preview (browser console,
checking for CSP violation warnings) before merge** - it was authored
by reasoning about known script sources, not empirically verified
against a live render.

### Scheduled `rate_limit` pruning
Both Better Auth's own rate limiter and the self-built one only
opportunistically delete an expired row as a side effect of a fresh
request landing on the same key - with no further traffic on a given
key, its row grows stale forever. A new scheduled Azure DevOps pipeline
(`pipelines/cd/prune-rate-limit.yml`, daily cron) reuses the CD
pipeline's own proven firewall-rule-open/Node-script/firewall-rule-
close pattern (`pipelines/cd/web.yml`'s `ApplyMigration` stage) rather
than an Azure Automation runbook: Automation's sandboxed PowerShell
runtime has no `psql`/Npgsql precedent in this repo (the existing
`cost-circuit-breaker` runbook only calls Az PowerShell modules, never
raw SQL), and a Python runbook would need its own new module-import
setup proven from scratch. The chosen pipeline needs no new tooling at
all - just the same Node/`pg` script already working elsewhere in this
repo.


### First real-use feedback: Turnstile UX, error styling, password strength
A round of genuine first-time use (not a code review) on the live
site, immediately after the two build-time-inlining bugs above were
fixed, surfaced five further issues - four real defects and one
already-correctly-explained observation:

- **`appearance: "interaction-only"` left a silent, unexplained
  disabled button.** On a desktop visitor Managed mode judges
  low-risk, Turnstile passes entirely in the background with no
  checkbox ever shown - but the submit button still stays disabled
  for the several seconds that background check takes, with nothing
  on screen explaining why. This read as a frozen/broken page, not
  "a check is running" - confirmed directly by using the live
  sign-up/log-in forms on two different network paths (a UK VPN,
  which escalated to a visible checkbox, and a bare connection, which
  did not). Reversed to Cloudflare's own default, `"always"`, which
  shows the widget/spinner from page load in every case - see
  `turnstile-widget.tsx`'s updated comment for the full trade-off.
- **A genuine, reproducible "Captcha verification failed" bug on
  sign-up, not a fluke.** Turnstile tokens are single-use and expire
  after 300 seconds (Cloudflare's own documented limits), and this
  codebase never called `turnstile.reset()` anywhere - a token that
  passed silently early (exactly the common case above) and was then
  submitted after any failure (a duplicate email, a network hiccup,
  simply taking a while to fill in the rest of the form) got resent
  unchanged on retry, which Cloudflare's `siteverify` rejects with
  `timeout-or-duplicate`, surfaced by Better Auth as the generic
  "Captcha verification failed" - reproduced live by signing up with
  an already-registered address. Fixed by exposing a
  `TurnstileWidgetHandle.reset()` method (via a `handleRef` prop) and
  calling it from every failure branch of `SignUpForm`, `LogInForm`,
  and `ForgetPasswordForm` - not just a captcha-specific error branch,
  since the stale-token problem is triggered by ANY retry, not only a
  captcha-related one.
- **Error messages carried no error signal at all.** Every
  `role="alert"` box across the app used the same neutral
  `--surface-border`/`--surface` tokens as a plain informational
  box - no color, icon, or visual distinction from "just some text"
  existed anywhere. Added `--danger`/`--danger-border`/
  `--danger-surface` tokens (`globals.css`, WCAG-verified per profile:
  9.16:1 default light, 9.25:1 default dark, 9.18:1 obsidian, 8.54:1
  editorial, 8.75:1 tactical - all comfortably over the 7:1 text bar)
  and a shared `FormError` component pairing that color with a
  warning glyph, never color alone, per this file's own accessibility
  rule. Replaces six duplicated inline `<p role="alert">` blocks
  across `sign-up-form.tsx`, `log-in-form.tsx`,
  `forget-password-form.tsx`, `reset-password-form.tsx`,
  `export-data-button.tsx`, and `delete-account-form.tsx`.
- **Password strength: only a bare `minLength={8}`.** Better Auth's
  own `emailAndPassword` config exposes no complexity option, only
  `minPasswordLength`/`maxPasswordLength` (verified directly against
  `@better-auth/core`'s `init-options` type) - this left sign-up
  relying entirely on the browser's own generic "Please lengthen this
  text..." tooltip, with zero complexity requirement. Added
  `features/auth/password-strength.ts` (length ≥ 8 + one uppercase +
  one lowercase + one number + one special character) as the single
  source of truth, enforced identically client-side
  (`PasswordStrengthMeter`, a live pass/fail checklist replacing
  reliance on the native browser message, on `SignUpForm` and
  `ResetPasswordForm`) and server-side (`auth.ts`'s existing
  `hooks.before` middleware, since a client-only check is trivially
  bypassed by calling either endpoint directly).

- **Google Password Manager's generated password sometimes omitted a
  special character.** Confirmed against Apple's own official
  `passwordrules` spec (the format both Safari and Chrome implement
  for password generation): with no `passwordrules` attribute on the
  input, the documented default is `allowed: ascii-printable` -
  special characters are *permitted* but never *required*, so a
  generated password can legitimately come back with only letters
  and digits, silently failing this app's own new server-enforced
  strength rule the moment the visitor tries to submit it. Fixed by
  adding a `passwordRules` attribute to `PasswordField`'s underlying
  `<input>` (only when `autoComplete="new-password"` - meaningless on
  a login field's existing password), built once as
  `PASSWORD_RULES_ATTRIBUTE` in `features/auth/password-strength.ts`
  so the two rules are documented side by side, even though the
  `passwordrules` spec's own character-class keywords
  (`upper`/`lower`/`digit`/`special`) aren't spelled the same as
  `PASSWORD_STRENGTH_RULES`'s ids and can't be mechanically derived
  from them.

**Observed but not a defect, documented for the record:** Chrome's
Issues panel flagged "Content Security Policy of your site blocks the
use of 'eval' in JavaScript" against `challenges.cloudflare.com`'s own
script. This CSP is correctly doing its job - Cloudflare's own
official CSP reference (`developers.cloudflare.com/turnstile/
reference/content-security-policy/`) documents only `script-src`/
`frame-src` as required, with no `unsafe-eval` allowance, and the
widget rendered and functioned correctly in both the escalated-
checkbox and silent-pass cases observed live. The "Deprecated feature:
Protected Audience API" and "Page layout may be unexpected due to
Quirks Mode" issues in the same panel are both flagged against
`challenges.cloudflare.com`'s own hosted iframe document, not this
site's markup - not actionable here.

### UK GDPR transparency notice on `/sign-up` and `/log-in`
A real, confirmed gap, distinct from everything above: `/legal`
already correctly documents the account-data lawful basis (contract,
Article 6(1)(b)), retention, and rights, but neither `/sign-up` nor
`/log-in` linked to it or gave any notice at the point of data
collection - a user creating an account had no way to discover that
page unless they already knew to check the footer. Fixed with a short,
one-line notice plus a `/legal` link placed directly below the submit
button on both pages (and `/forget-password`). Data minimisation
(name/email/password only, no unnecessary fields) and the absence of
any marketing-consent checkbox were both already correct by
construction and needed no change.

## Considered Options
- **A self-run nginx/reverse-proxy sidecar** to normalize/trust
  forwarded headers - rejected: adds new infrastructure with no
  current traffic volume to justify it, and Azure App Service's own
  front-end is already the trust boundary; a sidecar the app doesn't
  control doesn't change what can be trusted about `X-Forwarded-For`.
- **`TRUST_PROXY=true` as an App Service application setting** -
  rejected: not a real Better Auth or Next.js standalone-server
  concept (confirmed against both `better-auth`'s and Next.js's own
  documented options) - it is an Express.js/`express-rate-limit`
  convention this stack does not use; setting it would be a silent
  no-op.


## Consequences
- New Key Vault secrets (manual provisioning, ADR-0004 pattern):
  `turnstile-secret-key-devafusion`, `turnstile-site-key-devafusion`,
  `form-timing-token-secret-devafusion`.
- New `rateLimit`/`rate_limit` Drizzle table and migration
  (`drizzle/0001_brown_hemingway.sql`), CLI-generated per ADR-0012's
  established discipline - do not hand-edit its column definitions.
- New scheduled pipeline (`pipelines/cd/prune-rate-limit.yml`) requires
  the same one-time manual Azure DevOps environment/approval setup as
  `devafusion-dev-migrations` (`infrastructure/AGENTS.md` §PostgreSQL).
- `sendResetPassword` is stubbed to log a warning rather than actually
  deliver an email - this project has no email-sending infrastructure
  yet. Choosing a real provider (Azure Communication Services Email vs.
  a transactional API) is a deliberate, separate follow-up decision,
  not built as part of this ADR.
- The new CSP header needs the manual live-preview verification noted
  above before merge.
- PgBouncer adoption remains an open follow-up, gated on the revisit
  trigger above.

## Related
- ADR-0004 (Key Vault secret provisioning boundary)
- ADR-0010 (PostgreSQL Flexible Server selection, cost circuit breaker)
- ADR-0012 (Better Auth identity and self-hosted MFA)
- `docs/gdpr/0001-turnstile-legitimate-interests-assessment.md`
- `infrastructure/AGENTS.md` §PostgreSQL (migration-file discipline)
- `src/web/AGENTS.md` §Accessibility Theme Engine (the inline script
  this ADR's CSP had to account for)
