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

### Resend has no per-email tracking override - domain-level only
An earlier draft assumed a `tracking: { click: false, open: false }`
option on Resend's send-email call. Verified directly against the
installed `resend@^6.28.1` package's `CreateEmailOptions` type and
Resend's own current API reference: no such per-email field exists.
Open/click tracking is a domain-level setting only
(`open_tracking`/`click_tracking` on the `Domain`/`DomainApiOptions`
types) - `features/auth/mfa/send-email-otp.ts` documents this as an
operational invariant (the sending domain must have both disabled at
setup) rather than fabricating a nonexistent per-send parameter.

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

## Consequences
- `db/schema.ts`: `mfaFrequencyEnum`, `userSecurity.requiredFactors`/
  `mfaFrequency`, new `backupCodes`/`trustedDevices`/`authAuditLogs`
  tables, migrated via `drizzle/0002_sticky_orphan.sql` - applied and
  verified against a real, fresh `postgres:16` Docker container
  (every column, default, and `ON DELETE CASCADE` FK checked via
  `psql \d`, per `src/web/AGENTS.md`'s mandatory local migration
  testing rule).
- New dependencies: `lru-cache` (MFA progress cache), `resend` (email
  OTP dispatch) - both added to `src/web/package.json` as a
  deliberate, logged decision (root `AGENTS.md`'s Standardized
  Tooling rule); `npm audit` confirmed zero new vulnerabilities
  beyond the already-accepted, pre-existing `drizzle-kit`/`esbuild`/
  `lighthouse` dev-tooling advisories.
- New CSS design tokens: `--warning`/`--warning-border`/
  `--warning-surface` (`app/globals.css`), added across the default
  theme and all three named accessibility profiles, each independently
  WCAG-contrast-checked against the real relative-luminance formula -
  mirrors `--danger`'s existing pattern exactly.
- New Key Vault secrets for the email-OTP factor, wired into
  Terraform per ADR-0004's sanctioned-manual-step pattern (a human
  creates the value in Key Vault first, Terraform only ever reads it
  via `data "azurerm_key_vault_secret"`):
  `resend-api-key-devafusion` (a Resend API key, generated in the
  Resend dashboard for a domain with `open_tracking`/`click_tracking`
  left disabled - see this ADR's own Resend rationale above) and
  `resend-mfa-from-address-devafusion` (the verified From address on
  that domain, e.g. `"Devafusion <mfa@devafusion.com>"` - not itself
  sensitive but kept alongside the API key rather than a plain
  `.tfvars` literal, matching `turnstile_site_key`'s existing
  precedent). Both are read into the web app's `RESEND_API_KEY`/
  `RESEND_MFA_FROM_ADDRESS` app_settings
  (`infrastructure/app/environments/dev/web.tf`).
  `terraform fmt -check` and `terraform validate` both passed for
  `infrastructure/app`.
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
