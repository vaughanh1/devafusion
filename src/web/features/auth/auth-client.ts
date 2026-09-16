import { createAuthClient } from "better-auth/react";

// Deliberately no "server-only" guard - unlike every other module under
// features/auth/, this one is designed to run in the browser. No
// plugins are registered here: MFA is self-built (docs/adr/0012), not
// Better Auth's own twoFactor plugin, so there is no twoFactorClient to
// wire in.
export const authClient = createAuthClient();
