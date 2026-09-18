import "server-only";

import { z } from "zod/v4";

// Perimeter validation for the sequential MFA matrix verification
// route (src/web/AGENTS.md Database, Schema Sharing & Future Forms).
// code is intentionally a bare string, not regex-constrained to 6
// digits here - unlike the old, session-gated TOTP-only route this
// replaces, factorType can be 'backup_code' (a 12-character
// alphanumeric string, see backup-code-hash.ts), so per-factor shape
// validation happens after factorType is known, inside the route
// itself, not in this shared perimeter schema.
export const verifyFactorRequestSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(1),
  factorType: z.enum(["totp", "email", "backup_code"]),
  trustDevice: z.boolean().optional(),
});

export type VerifyFactorRequest = z.infer<typeof verifyFactorRequestSchema>;
