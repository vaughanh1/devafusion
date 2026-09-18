import "server-only";

import { z } from "zod/v4";

// Perimeter validation for the authenticated TOTP-enable confirmation
// route (src/web/AGENTS.md Database, Schema Sharing & Future Forms) -
// a 6-digit numeric string, exactly what otpauth's default TOTP
// digits option produces.
export const confirmTotpRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "TOTP code must be exactly 6 digits."),
});

export type ConfirmTotpRequest = z.infer<typeof confirmTotpRequestSchema>;
