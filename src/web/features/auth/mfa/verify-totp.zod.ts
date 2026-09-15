import "server-only";

import { z } from "zod/v4";

// Perimeter validation for the TOTP verification route (src/web/AGENTS.md
// Database, Schema Sharing & Future Forms) - a 6-digit numeric string,
// exactly what otpauth's default TOTP digits option produces. Rejects
// anything else (wrong length, non-digits) before it ever reaches
// otpauth.validate() or touches the database.
export const verifyTotpRequestSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, "TOTP code must be exactly 6 digits."),
});

export type VerifyTotpRequest = z.infer<typeof verifyTotpRequestSchema>;
