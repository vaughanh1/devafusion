# Extensible self-hosted MFA matrix: sequential factors, encrypted-column customType, session-withholding login flow

Devafusion's identity layer (ADR-0012) supported exactly one optional
factor - TOTP, all-or-nothing. This ADR extends it into a dynamically
sequenced matrix (`required_factors: text[]`, e.g. `['password',
'totp', 'email']`) that can demand multiple factors in order,
accommodate a future factor (WebAuthn/passkeys) without a schema
change, and adds backup codes, PECR-compliant trusted-device bypass,
and UK GDPR SAR export/deletion coverage for all of it.

## Status
Accepted

## Rationale

### `encryptedSecretText` customType supersedes the manual cipher calls
ADR-0012's `two_factor_secret` column was a plain `text()` column with
callers manually invoking `encryptTwoFactorSecret`/
`decryptTwoFactorSecret` (`features/auth/mfa/two-factor-secret-cipher.ts`,
dot-delimited base64 format) before every write/read - a convention,
not a structural guarantee, and easy to forget in a new call site.
This slice replaces it with a Drizzle `customType`
(`encryptedSecretText`, `db/schema.ts`) whose `toDriver`/`fromDriver`
hooks call the encryption boundary transparently
(`features/auth/mfa/encrypted-column-cipher.ts`, colon-delimited hex
`ivHex:authTagHex:ciphertextHex`) - every repository method now reads
and writes plaintext, and the only way to bypass encryption would be
to bypass Drizzle's column type entirely. Same AES-256-GCM primitive
and the same `MFA_ENCRYPTION_KEY` Key Vault secret as before; the
stored format changes (a one-time re-enrolment cost, accepted since
no live account had TOTP enabled yet).

### No `dontCreateSession` flag, no public `createSession` - session cookies are withheld, not deferred
An initial design assumed Better Auth's `signInEmail` accepted a
`dontCreateSession` body flag and that a session could be minted
later via `auth.api.createSession({ userId })`. Neither exists on the
installed `better-auth@^1.7.5` - confirmed directly against its
compiled source (`node_modules/better-auth/dist/api/routes/sign-in.mjs`'s
zod body schema is `email/password/callbackURL/rememberMe` only, and
`internalAdapter.createSession` is never re-exported on the public
`auth.api` surface). Rather than reimplement Better Auth's own
password-hash verification to sidestep this, `login-step1`'s route
lets `signInEmail` mint a real session (`asResponse: true` to get the
raw `Response`, including its `Set-Cookie` headers) and withholds
those cookies inside the MFA progress cache
(`features/auth/mfa/mfa-session-cache.ts`) until every remaining
factor is verified, at which point `two-factor/verify` releases them
verbatim. A password-only policy or a valid trusted-device bypass
releases the cookies immediately in `login-step1` itself.

### Turnstile is verified manually in `login-step1`, not via the captcha plugin
Better Auth's `captcha` plugin (`auth.ts`) intercepts requests via an
`onRequest` hook on Better Auth's own router dispatch pipeline - it
never fires for a direct `auth.api.signInEmail()` call, the identical
bypass ADR-0014 already documented for the rate-limit plugin.
`login-step1` therefore calls Cloudflare's real siteverify endpoint
itself (`features/auth/verify-turnstile-token.ts`,
`https://challenges.cloudflare.com/turnstile/v0/siteverify` - not the
bare `cloudflare.com` host an earlier draft of this design assumed).

### Resend rejected for UK GDPR data-residency, replaced by Azure Communication Services Email
Resend was the initial choice for email-OTP dispatch, but was
rejected after live investigation of its actual region behaviour: its
nearest-to-UK offering ("EU West", Ireland) is a **latency-
optimization region only** - email content itself is stored in the
US regardless of which region a Resend account is configured with,
confirmed directly through Resend's own account setup rather than
assumed. This is not adequate for an MFA code, which is personal data
tied to an identified UK user (UK GDPR Article 44's restriction on
transfers outside the UK/adequate jurisdictions without a valid
transfer mechanism, and this project's own already-settled data-
sovereignty position from ADR-0012's third-party-identity-SaaS
rejection).

Replaced with **Azure Communication Services Email**
(`@azure/communication-email`, `features/auth/mfa/send-email-otp.ts`)
- a first-party Microsoft service already inside this project's own
Azure tenant, with `data_location = "UK"` as a genuine, resource-
level Terraform attribute. Microsoft's own documented privacy page
states plainly that "the system processes email message content in
real-time, using the resource's Data Location specified by you during
resource provisioning" - a materially stronger, resource-scoped
guarantee than a SaaS vendor's account-level region setting. It also
removes the manual Key Vault step entirely for this integration: the
connection string (`azurerm_communication_service.primary_connection_string`)
and the Azure-managed domain's sender address are both Terraform-
computed outputs of resources Terraform itself provisions
(`infrastructure/app/modules/email/`), not human-invented secret
values - a different case from every ADR-0004 "sanctioned manual
step" secret elsewhere in this project.

An earlier draft (written before Resend's region behaviour was
checked) assumed a `tracking: { click: false, open: false }` option
on Resend's send-email call, which does not exist on Resend's real
API (open/click tracking there is domain-level only). Azure
Communication Services Email's tracking control is a genuine
Terraform-declared resource attribute
(`azurerm_email_communication_service_domain.user_engagement_tracking_enabled`,
defaulting to `false`), reinforced per-send via the SDK's own
`disableUserEngagementTracking` field - both layers enforced in code,
not a dashboard toggle that could silently drift.

### Backup codes: scrypt over SHA-256
A backup/recovery code has far less entropy than the TOTP seed it
substitutes for, so it is hashed with Node's built-in `scryptSync`
(memory-hard, tunable cost) rather than a fast hash - the same
reasoning that already justifies bcrypt/scrypt/Argon2 for passwords,
never applied to `two_factor_secret` itself since that value is never
compared, only decrypted and fed into `otpauth`.

## Considered Options
- **A second Better Auth `twoFactor` plugin instance per factor** -
  rejected outright per ADR-0012's already-settled plaintext-secret
  finding; irrelevant to how many factors are chained.
- **Storing the MFA progress state in the `rate_limit` table's
  pattern (Postgres-backed) instead of an in-memory LRU** - rejected:
  the progress state (which factors are done, a live email OTP) has
  no legitimate reason to survive more than a few minutes (UK GDPR
  Article 5(1)(c) data minimisation), and a Postgres row would need
  its own pruning job for data that should not persist that long in
  the first place. A lost entry on this single-instance app's
  restart/redeploy only forces a user to restart an in-progress
  login - nothing durable is lost, since `user_security` records
  which factors are required independently of any specific attempt.
- **Re-deriving the user's email per verification step instead of
  carrying it in the cache state** - rejected: no repository in this
  feature exposes email (`user_security` has none), and querying
  Better Auth's own `user` table from this feature would blur the
  repository-pattern boundary ADR-0011 established; carrying the
  already-resolved `session.user.email` from Step 1 is simpler and
  avoids a second, unrelated query.
- **Resend** - initially chosen, then rejected once its actual region
  behaviour was checked (see this ADR's own Resend rationale above):
  a latency-optimization region only, not a data-residency guarantee.
- **The Azure-managed `*.azurecomm.net` domain instead of a custom
  verified domain** - reversed after initial acceptance. A first pass
  of this ADR accepted the Azure-managed domain's lower deliverability
  ceiling as a trade-off for zero DNS setup, but this was overridden
  by an explicit product decision: MFA emails must come from
  `donotreply@devafusion.net`, a real, brand-trusted sender. See the
  Addendum below for the full custom-domain implementation.

## Addendum: custom domain, QR-as-image, accessible OTP formatting, missing frontend

A first pass of this slice shipped only the backend routes/repositories
with no frontend wiring, no e2e coverage, an Azure-managed sender
domain, a bare `otpauth://` URI returned instead of a scannable image,
and no UK GDPR-facing disclosure of any of it on `/legal`. This
addendum closes every one of those gaps.

### Custom domain: donotreply@devafusion.net
`infrastructure/app/modules/email`'s `azurerm_email_communication_service_domain`
now uses `domain_management = "CustomerManaged"` against `devafusion.net`
rather than `AzureManagedDomain`. The module exposes Azure's own
computed `verification_records` (domain-ownership TXT, SPF TXT, DKIM/
DKIM2 CNAME) as an output, and `environments/dev/dns.tf` wires each
one into a real `azurerm_dns_*` resource on the existing
`devafusion_net` zone - entirely independent of `devafusion.com`'s
separate Microsoft 365 DKIM/DMARC records (different domain, different
mail system). DMARC is a literal `p=none` record (Azure's own
verification does not require a specific DMARC policy, only that one
exists), matching the same monitor-only stance already used for
`devafusion.com`. Verification is automatic once the DNS records are
live (Microsoft's documented 15-30 minute propagation window) - no
manual "click verify" step. The sender's local-part stays `donotreply`
(not `noreply`) - confirmed acceptable rather than provisioning a
second sender address to verify. A friendly display name is added on
top of this address via `azurerm_email_communication_service_domain_sender_username`
- see the Second Addendum below for the correction of an earlier,
wrong claim that this resource did not exist.

**Open item, not yet verified**: `dns.tf`'s `trimsuffix()` normalisation
of `verification_records[].name` assumes Azure returns a fully-
qualified name; this was not confirmed against a live subscription (see
that file's own CAVEAT comment). Must be checked via `terraform plan`
against a real Azure subscription before this is ever applied.

### QR code is now a real image, with a text fallback
`features/auth/mfa/totp-qr-code.ts` (the `qrcode` npm package) renders
the enrolment `otpauth://` URI as a PNG data URI - `enrol/route.ts`
now returns `qrCodeDataUri` instead of a bare URI string, and
`components/account/totp-enrolment.tsx` renders it via `next/image`
(`unoptimized`, since a data URI has nothing for the image optimizer
to fetch) with accessible `alt` text that includes the manual-entry
secret. The base32 secret (`manualEntrySecret`) is also always shown
as selectable text in a `<details>` disclosure, independent of the
image, so a screen-reader user, a client that strips images, or
anyone who simply cannot scan a QR code can still complete enrolment
by typing the secret into their authenticator app manually.

### Accessible OTP formatting
`features/auth/mfa/format-otp-for-accessibility.ts` spaces every digit
of a numeric code ("1 2 3 4 5 6", never "123456" or "123 456") - a
bare digit run is read by every major screen reader (and spoken aloud
by a sighted user) as one large number, not six discrete characters.
Applied to the email-OTP's plain-text body (`send-email-otp.ts`) and
matched by `MfaChallengeForm`'s own input handling, which strips
spaces back out before submitting so a user who copies the
accessible-formatted text verbatim still succeeds. Backup codes
(alphanumeric, not digits, already using a 0/O/1/I-free alphabet) have
no equivalent grouping concern and are left as-is, each rendered on
its own line so a screen reader still announces them individually
rather than as one run-on sentence.

### The missing frontend
No page ever called `login-step1`, `two-factor/enrol`,
`two-factor/confirm`, or `two-factor/verify` - `log-in-form.tsx` still
called Better Auth's own `authClient.signIn.email()` directly, and
`MfaSettingsDashboard` saved policy changes with no enrolment flow
behind them. Added:
- `components/auth/mfa-challenge-form.tsx` - the sequential-matrix
  challenge UI, looping on a `202` response's `nextFactorNeeded`/
  `pendingToken` without a full page reload, and navigating away only
  once the server returns `verified: true`.
- Rewrote `app/log-in/log-in-form.tsx` to call `login-step1` and
  render `MfaChallengeForm` when `mfaRequired` comes back true.
- `components/account/totp-enrolment.tsx` - calls `enrol` then
  `confirm`, rendering the QR/secret/backup codes and the confirmation
  input; wired into `MfaSettingsDashboard` when TOTP is selected.

**A real bug found and fixed while wiring this up**: `auth.ts`'s
`hooks.before` timing-token check (`features/auth/form-timing-token.ts`)
runs for every `auth.api.*` call, including a direct
`auth.api.signInEmail()` call from application code, not only requests
dispatched through Better Auth's own router - confirmed directly
against `better-auth`'s compiled `dispatch.mjs` (`runBeforeHooks` reads
the raw, not-yet-validated input body before the endpoint's own zod
schema runs, so an extra field survives). This is a different
mechanism from the `captcha` plugin's `onRequest` hook, which is
router-only and does **not** fire for a direct call (already
documented above). `login-step1` was silently missing
`formTimingToken` entirely - every real call to it would have failed
closed with `FORM_TIMING_CHECK_FAILED`, a bug that had no test
coverage until this addendum's e2e spec.

### Legal disclosure
`/legal` had zero mention of MFA - no sub-processor disclosure for
Azure Communication Services, no lawful basis stated, no disclosure
of the trusted-device cookie or the in-memory progress cache. Added a
dedicated "Multi-factor authentication (MFA)" section following the
exact disclosure pattern the existing Cloudflare Turnstile section
already established (processor name, lawful basis, cookie purpose,
data minimisation), and updated "What is not collected" to name Azure
Communication Services alongside Google Analytics/Turnstile as the
only third parties involved.

### Test coverage added
Component tests for `MfaChallengeForm`, `TotpEnrolment`, and
`MfaSettingsDashboard` (previously untested entirely), unit tests for
the two new pure helpers (`format-otp-for-accessibility.ts`,
`totp-qr-code.ts` - the latter against the real `qrcode` library, not
a mock), a rewritten `log-in-form.test.tsx` (mocking `fetch` instead of
the now-unused `authClient.signIn.email`), and a `TEST_MFA_FLOWS`-gated
e2e spec (`tests-e2e/mfa-flow.spec.ts`) exercising the real sign-up →
enrol → confirm → log-out → log-in → challenge round trip against a
real Postgres connection, using the real `otpauth` library to generate
valid codes - the same gating pattern `sign-up.spec.ts` already
established for `TEST_DB_ACTIONS`, since `pipelines/ci/web.yml`'s
`E2ETests` job has no PostgreSQL sandbox wired up yet.

### Cost correction
Azure Communication Services Email has **no free tier** - it is billed
per email sent plus per MB transferred (Azure's published Communication
Services pricing page). This was omitted from the original ADR text;
`features/auth/mfa/send-email-otp.ts` now carries this as an explicit
comment. At this project's expected MFA-OTP volume the cost is small,
but it is a real, ongoing, metered line item against this project's
Azure bill, not a zero-cost service - this should have been stated
plainly the first time Azure Communication Services was proposed as
the Resend replacement.

## Second addendum: sender display name, comma-vs-space correction, i18n-ready copy, M365 clarification

### Sender display name was wrongly claimed unsupported - corrected
An earlier version of this ADR/`send-email-otp.ts`'s own comment
stated `azurerm` had no Terraform resource for a custom sender display
name. That claim was wrong and was made without actually checking the
provider's registry docs - corrected after verifying directly:
`azurerm_email_communication_service_domain_sender_username` exists,
takes `name` (the MailFrom local-part) and `display_name`, and is now
provisioned in `infrastructure/app/modules/email/main.tf` as
`donotreply` with `display_name = "Devafusion"`. The display name is
a resource-level setting Azure attaches automatically based on which
verified sender address is used - `send-email-otp.ts`'s SDK call still
only ever passes the plain address string; there is no per-send
display-name parameter in the installed `@azure/communication-email`
SDK.

### Comma-separated OTP digits would not have worked
Clarified in `format-otp-for-accessibility.ts`'s own comment: a
comma-separated code ("1, 2, 3, 4, 5, 6") is not equivalent to a
space-separated one for accessibility purposes. Screen readers and
text-to-speech/dictation engines treat a comma as a clause/pause
marker, not a hard digit boundary, so "1, 2, 3" can still be read as
"one two three" with only a brief pause rather than three fully
distinct digits. The implementation already used spaces, not commas -
this addendum only strengthens the comment and adds an explicit test
asserting the output never contains a comma, so a future edit cannot
silently regress this.

### Email copy is no longer inlined - a lightweight seam for future i18n
This project has no i18n library or locale routing today (confirmed:
no `next-intl` or equivalent is installed) - adopting one now, before
it's actually needed, would be exactly the kind of speculative
dependency root `AGENTS.md`'s "No Vibe-Coding" rule warns against.
Instead, `features/auth/mfa/email-otp-content.ts` centralises the
subject/body strings as plain functions (`emailOtpSubject()`,
`emailOtpBody(accessibleCode)`) rather than inlining them into
`send-email-otp.ts`'s SDK call - a real i18n library, when actually
adopted, only has to change this one file (parameterising both
functions by a locale argument, or replacing them with the library's
own `t()` calls), not hunt through the SDK call site for hardcoded
strings.

### Microsoft 365 mailbox on devafusion.com - no conflict
Confirmed directly against `dns.tf`: the Microsoft 365 Business
mailbox's MX/autodiscover/DKIM-selector/DMARC records are all scoped
to `azurerm_dns_zone.devafusion_com`, a completely separate DNS zone
resource from this module's `devafusion.net` (`azurerm_dns_zone.devafusion_net`).
SPF, DKIM, and DMARC are all scoped per-domain, not per-tenant or
per-subscription - `devafusion.net`'s own SPF/DKIM/DMARC records
neither read nor overwrite anything belonging to the `devafusion.com`
M365 mailbox. `environments/dev/email.tf` now carries this as an
explicit comment so the question does not need re-asking in a future
review.

## Consequences
- `db/schema.ts`: `mfaFrequencyEnum`, `userSecurity.requiredFactors`/
  `mfaFrequency`, new `backupCodes`/`trustedDevices`/`authAuditLogs`
  tables, migrated via `drizzle/0002_sticky_orphan.sql` - applied and
  verified against a real, fresh `postgres:16` Docker container
  (every column, default, and `ON DELETE CASCADE` FK checked via
  `psql \d`, per `src/web/AGENTS.md`'s mandatory local migration
  testing rule).
- New dependencies: `lru-cache` (MFA progress cache),
  `@azure/communication-email` (email OTP dispatch, replacing an
  earlier `resend` choice - see this ADR's own rationale above) -
  both added to `src/web/package.json` as a deliberate, logged
  decision (root `AGENTS.md`'s Standardized Tooling rule); `npm
  audit` confirmed zero new vulnerabilities beyond the already-
  accepted, pre-existing `drizzle-kit`/`esbuild`/`lighthouse` dev-
  tooling advisories.
- New CSS design tokens: `--warning`/`--warning-border`/
  `--warning-surface` (`app/globals.css`), added across the default
  theme and all three named accessibility profiles, each independently
  WCAG-contrast-checked against the real relative-luminance formula -
  mirrors `--danger`'s existing pattern exactly.
- New `infrastructure/app/modules/email/` module: `azurerm_email_communication_service`
  (`data_location = "UK"`), `azurerm_email_communication_service_domain`
  (Azure-managed domain, `user_engagement_tracking_enabled = false`),
  `azurerm_communication_service` (exposes `primary_connection_string`),
  and `azurerm_communication_service_email_domain_association` linking
  them. Both `ACS_EMAIL_CONNECTION_STRING`/`ACS_EMAIL_MFA_SENDER_ADDRESS`
  app_settings (`infrastructure/app/environments/dev/web.tf`) are
  Terraform-computed module outputs - **no manual Key Vault step is
  required for this integration at all**, unlike every other secret
  in this project (ADR-0004): nothing here is a human-invented
  credential, since Terraform itself provisions the resource that
  generates the connection string. `terraform fmt -check` and
  `terraform validate` both passed for `infrastructure/app`.
- **Passkeys/WebAuthn**: `required_factors: text[]` already
  accommodates a future `'webauthn'` string with zero schema
  refactoring - adding it is a new factor-type branch in
  `two-factor/verify`'s route plus a new enrolment route, not a new
  ADR-level architectural decision.
- **Social login (OAuth) interaction with this MFA matrix is
  explicitly out of scope for this slice.** Better Auth's own
  `signIn.social`/`callback/*` paths never touch `userSecurity` or
  password verification, so gating a social-login user against
  `required_factors` needs a separate `after` hook on those paths
  (mirroring this slice's own `deleteUser`-path `after` hook pattern
  in `auth.ts`) - a real, tracked follow-up, not silently ignored.
- `app/api/auth/two-factor/verify/route.ts`'s prior, session-gated,
  TOTP-only implementation is fully replaced (no frontend ever called
  it - ADR-0012's own follow-up slice deferred MFA challenge UI
  entirely) by the pre-auth sequential matrix version. A separate,
  authenticated confirmation route
  (`app/api/auth/two-factor/confirm/route.ts`) now owns flipping
  `two_factor_enabled` to `true` after enrolment, distinct from the
  pre-auth verification path.

## Related
- ADR-0012 (Better Auth identity and self-hosted MFA)
- ADR-0014 (client-level auth hardening, rate limiting, Turnstile)
- ADR-0011 (Drizzle ORM, repository pattern)
- `src/web/AGENTS.md` §Identity & MFA, §Local Postgres for Migration Testing
