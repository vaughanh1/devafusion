import "server-only";

import { z } from "zod/v4";

// Perimeter validation for login-step1 (src/web/AGENTS.md Database,
// Schema Sharing & Future Forms) - email/password/captchaToken are
// all forwarded verbatim into Better Auth's own signInEmail body and
// the captcha header respectively, so this schema's only job is to
// reject a structurally malformed request before either of those
// real calls happen.
export const loginStep1RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  captchaToken: z.string().min(1),
  // auth.ts's hooks.before timing-token check runs for every
  // auth.api call, including this route's direct
  // auth.api.signInEmail() call (confirmed directly against
  // better-auth's dispatch.mjs - before-hooks run identically for
  // router-dispatched and direct auth.api.* calls) - "/sign-in/email"
  // is in TIMING_PROTECTED_PATHS, so this must be forwarded into
  // signInEmail's body or every real call fails closed with "Request
  // could not be verified."
  formTimingToken: z.string().min(1),
});

export type LoginStep1Request = z.infer<typeof loginStep1RequestSchema>;
