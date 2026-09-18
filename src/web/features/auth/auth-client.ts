import { createAuthClient } from "better-auth/react";

// Deliberately no "server-only" guard - unlike every other module under
// features/auth/, this one is designed to run in the browser. No
// plugins are registered here: MFA is self-built (docs/adr/0012), not
// Better Auth's own twoFactor plugin, so there is no twoFactorClient to
// wire in.
export const authClient = createAuthClient();

// login-step1 and two-factor/verify (features/auth/mfa/) mint a real
// session by calling Better Auth's server-side auth.api.signInEmail
// directly, then release its Set-Cookie headers from a plain custom
// Next.js API route - never through authClient's own internal $fetch
// wrapper (docs/adr/0015: this project's own MFA matrix deliberately
// sits outside Better Auth's router). authClient.useSession()'s
// nanostore session atom only re-fetches when Better Auth's client
// config's atomListeners fires $sessionSignal on paths it dispatched
// itself (/sign-in/email, /sign-out, etc. - confirmed directly against
// node_modules/better-auth/dist/client/config.mjs) - a session minted
// by this project's own custom routes never triggers that listener, so
// useSession() (AccountNav's header, e.g.) keeps showing stale
// logged-out state after a real successful login until something else
// happens to trigger a refetch (a hard reload, a 5s-rate-limited
// window-focus refetch). $store.notify is the same mechanism Better
// Auth's own client config uses internally for this exact class of
// event - call this immediately after any custom route mints or
// revokes a session outside authClient's own dispatch.
export function notifySessionChanged(): void {
  authClient.$store.notify("$sessionSignal");
}
