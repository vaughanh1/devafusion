import "server-only";

import { z } from "zod/v4";

// Perimeter validation for the TOTP enrolment route (src/web/AGENTS.md
// Database, Schema Sharing & Future Forms). password is optional on
// the wire - a first-time enrolment has no existing factor to prove
// ownership of, so nothing to re-confirm yet. A RE-enrolment (the
// account already has twoFactorEnabled=true, e.g. recovering from a
// lost authenticator device) requires it, enforced in the route
// itself rather than here, since that check depends on the existing
// user_security row, not on the request body alone.
export const enrolTotpRequestSchema = z.object({
  password: z.string().min(1).optional(),
});

export type EnrolTotpRequest = z.infer<typeof enrolTotpRequestSchema>;
