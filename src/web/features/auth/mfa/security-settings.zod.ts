import "server-only";

import { z } from "zod/v4";

// Perimeter validation for the authenticated security-settings
// mutation route (src/web/AGENTS.md Database, Schema Sharing &
// Future Forms). password is mandatory on every payload - ADR-0012/
// this slice's own requirement that ANY change to this table be
// re-authorized by the current password, mirroring
// DeleteAccountForm's existing pattern for account deletion.
export const securitySettingsRequestSchema = z.object({
  password: z.string().min(1),
  requiredFactors: z
    .array(z.enum(["password", "totp", "email"]))
    .min(1)
    .refine(
      (factors) => factors[0] === "password",
      "password must always be the first required factor.",
    ),
  mfaFrequency: z.enum(["always", "30_days"]),
  // Required only when the user is deliberately weakening to a
  // single-factor policy (password-only or, in principle, any set
  // not including totp/email as an additional layer) - enforced
  // client-side by disabling the save button (MfaSettingsDashboard),
  // re-enforced here since client-side state is never authoritative.
  riskAcknowledged: z.boolean().optional(),
});

export type SecuritySettingsRequest = z.infer<
  typeof securitySettingsRequestSchema
>;
