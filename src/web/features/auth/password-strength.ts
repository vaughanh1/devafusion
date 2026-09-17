// ADR-0014: Better Auth's own emailAndPassword config exposes only
// minPasswordLength/maxPasswordLength (verified directly against
// @better-auth/core's init-options type - no complexity option
// exists) - length alone left the sign-up/reset-password forms
// relying on the browser's own generic "Please lengthen this text..."
// validation message and no complexity requirement at all. This
// shared rule is enforced identically on the client (real-time
// feedback) and the server (auth.ts's hooks.before, since a client-
// side-only check is trivially bypassed by anyone calling the API
// directly) - the single source of truth lives here, not duplicated.
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordStrengthRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_STRENGTH_RULES: PasswordStrengthRule[] = [
  {
    id: "length",
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (password) => password.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "special",
    label: "One special character",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function isPasswordStrongEnough(password: string): boolean {
  return PASSWORD_STRENGTH_RULES.every((rule) => rule.test(password));
}

// The passwordrules HTML attribute (Apple's spec, also implemented by
// Chrome/Google Password Manager - confirmed directly against Apple's
// official documentation) tells a browser's password generator which
// character classes to include. With no such attribute, the
// documented default is "allowed: ascii-printable" - special
// characters are *permitted* but never *required*, so a generated
// password can (and, observed live, sometimes does) come back with
// only letters and digits, silently failing this app's own server-
// enforced rule the moment the visitor tries to submit it. The
// character-class identifiers here (upper/lower/digit/special) are
// the passwordrules spec's own fixed vocabulary, not expressible as a
// mechanical transform of PASSWORD_STRENGTH_RULES's ids (which name
// the same four classes but aren't spelled identically) - kept as an
// explicit literal, cross-checked by hand against
// PASSWORD_STRENGTH_RULES whenever either changes. minlength is the
// one value actually shared, via MIN_PASSWORD_LENGTH.
export const PASSWORD_RULES_ATTRIBUTE = `required: upper; required: lower; required: digit; required: special; minlength: ${MIN_PASSWORD_LENGTH};`;
