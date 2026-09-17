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
});

export type LoginStep1Request = z.infer<typeof loginStep1RequestSchema>;
