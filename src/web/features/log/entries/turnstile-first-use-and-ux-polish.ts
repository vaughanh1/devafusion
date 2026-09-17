import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "turnstile-first-use-and-ux-polish",
  date: "2026-09-17",
  title: "First real-use feedback: Turnstile UX, error styling, password strength, passwordrules",
  summary:
    "A round of genuine first-time use on the live sign-up/log-in forms (not a code review) surfaced four real defects: appearance:'interaction-only' left the submit button silently disabled for several seconds with no visible feedback on a low-risk visitor, a genuine reproducible 'Captcha verification failed' bug caused by never calling turnstile.reset() on a spent/stale token, error messages with no color/icon signal at all, and a new password complexity rule (Better Auth exposes only a length option) that Google Password Manager's own generated passwords didn't reliably satisfy until a passwordrules attribute was added. A fifth observation (a Chrome DevTools CSP-blocks-eval warning against Cloudflare's own script) was confirmed benign and documented, not fixed.",
  tags: ["bugfix", "accessibility", "ui", "security"],
  decisions: [
    "Reversed appearance from 'interaction-only' back to Cloudflare's own default, 'always' - interaction-only kept the form visually clean for the common silent-pass case, but left the submit button disabled with zero visible feedback for the several seconds Managed mode's background check takes on a low-risk visitor, which read as a frozen page rather than 'a check is running'. Confirmed directly by using the live forms on two different network paths (a UK VPN, which escalated to a visible checkbox, and a bare connection, which did not).",
    "Exposed a TurnstileWidgetHandle.reset() method via a handleRef prop rather than a captcha-specific error hook, and call it from EVERY failure branch (wrong password, duplicate email, network error) of SignUpForm/LogInForm/ForgetPasswordForm - the stale/spent-token problem (Cloudflare tokens are single-use and expire after 300 seconds) is triggered by any retry after the widget already passed silently, not only by a captcha-specific rejection.",
    "Added --danger/--danger-border/--danger-surface CSS custom properties (default + all three named accessibility profiles) rather than a single hardcoded red, computing real WCAG relative-luminance contrast ratios for every pairing (all landed at 8.5:1 or higher against the 7:1 text bar) rather than eyeballing a color. Built a shared FormError component pairing the new tokens with a warning glyph, never color alone, replacing six duplicated inline <p role=\"alert\"> blocks across the app.",
    "Built features/auth/password-strength.ts as the single source of truth for password complexity (length >= 8, upper/lower/number/special), enforced identically client-side (a live PasswordStrengthMeter checklist, replacing reliance on the browser's own generic 'Please lengthen this text' tooltip) and server-side (auth.ts's existing hooks.before middleware) - Better Auth's own emailAndPassword config has no complexity option, confirmed directly against @better-auth/core's init-options type, so a client-only check would be trivially bypassed by calling either endpoint directly.",
    "Investigated a live Chrome DevTools Issues panel warning ('CSP blocks eval') against challenges.cloudflare.com's own script before assuming it needed a CSP change - confirmed against Cloudflare's own official CSP reference that no eval allowance is documented as required, and that the widget rendered and worked correctly in the same session the warning appeared in. Documented as an expected observation rather than weakening the CSP for a warning that doesn't affect functionality.",
    "Added a passwordRules attribute to PasswordField's underlying <input> (only when autoComplete='new-password' - meaningless on a login field's existing password), built once as PASSWORD_RULES_ATTRIBUTE in password-strength.ts - confirmed directly against Apple's own official passwordrules spec (the format both Safari and Chrome implement for password generation) that the documented default with no such attribute, 'allowed: ascii-printable', permits but never requires special characters, which is exactly why Google Password Manager's generated password sometimes lacked one and then failed this app's own new server-side check on submit.",
  ],
  milestones: [
    "components/auth/turnstile-widget.tsx: appearance changed to 'always'; added TurnstileWidgetHandle type and handleRef prop exposing reset().",
    "app/sign-up/sign-up-form.tsx, app/log-in/log-in-form.tsx, app/forget-password/forget-password-form.tsx: added a turnstileRef + resetCaptcha() helper called from every failure branch.",
    "app/globals.css: added --danger/--danger-border/--danger-surface tokens to :root, the dark-mode media query, and all three [data-a11y-theme] profiles.",
    "components/auth/form-error.tsx (new): shared error-alert component with a warning glyph, used by sign-up-form.tsx, log-in-form.tsx, forget-password-form.tsx, reset-password-form.tsx, export-data-button.tsx, and delete-account-form.tsx.",
    "features/auth/password-strength.ts (new): MIN_PASSWORD_LENGTH, PASSWORD_STRENGTH_RULES, isPasswordStrongEnough - shared by the client forms and auth.ts.",
    "components/auth/password-strength-meter.tsx (new): live pass/fail checklist, used by sign-up-form.tsx and reset-password-form.tsx.",
    "auth.ts: hooks.before now also rejects /sign-up/email and /reset-password when the relevant body field fails isPasswordStrongEnough.",
    "components/auth/password-field.tsx: added a passwordRules attribute (via PASSWORD_RULES_ATTRIBUTE), applied only for autoComplete='new-password' fields.",
    "features/auth/__tests__/password-strength.test.ts (new, including PASSWORD_RULES_ATTRIBUTE coverage); new Turnstile-reset-on-failure tests added to sign-up-form.test.tsx and log-in-form.test.tsx; tests-e2e/sign-up.spec.ts's password fixture updated to satisfy the new complexity rule.",
    "docs/adr/0014 updated with a 'First real-use feedback' section covering all four fixes plus the benign CSP-eval observation.",
  ],
  validation: [
    "npm run build, npm run lint, npm run typecheck all pass clean.",
    "npm run test:unit - 96/96 tests pass (14 new: 10 password-strength unit tests including PASSWORD_RULES_ATTRIBUTE coverage, 4 Turnstile-reset-on-failure tests across sign-up/log-in).",
    "Computed real WCAG relative-luminance contrast ratios (not eyeballed) for every --danger* pairing across the default theme and all three named accessibility profiles - lowest was 8.54:1, all comfortably over the 7:1 body-text bar.",
    "This fix could not be validated against a real Azure DevOps pipeline run or the live site before being documented, since both require a deploy that hasn't happened yet - local build/lint/typecheck/test and the WCAG computation are the strongest available proof short of that.",
  ],
  visibility: "public",
};
