import "server-only";

import { LRUCache } from "lru-cache";

// UK GDPR Article 5(1)(c) (data minimisation): the MFA challenge
// matrix's in-progress state (which factors are done, which remain,
// the live email OTP) has no legitimate reason to outlive the few
// minutes a real human takes to type a 6-digit code - a database row
// would need its own explicit pruning job (like rate_limit's), for
// data that should never persist that long in the first place. An
// in-memory LRU with a hard ttl is the correct minimisation choice
// here specifically because this is a single-instance App Service
// (db/client.ts's own comment) - a lost entry on restart/redeploy
// only ever forces a user to restart their in-progress login, it
// never loses anything durable (the record of *who* has MFA enabled
// and *which* factors they require lives in user_security, not here).
//
// max: 5000 bounds worst-case memory (a bounded number of concurrent
// in-progress logins) independently of the ttl - both limits are
// enforced by the same LRUCache instance, whichever is hit first.
const MFA_SESSION_CACHE_MAX_ENTRIES = 5000;
const MFA_SESSION_TTL_MS = 180_000; // 3 minutes.

export type MfaSessionState = {
  userId: string;
  // Carried from Step 1's already-resolved session.user.email rather
  // than re-queried per verification step - the repositories in this
  // feature never expose email (user_security has no such column),
  // and a subsequent email-factor dispatch (two-factor/verify's own
  // "next factor is also email" branch) needs somewhere to send to
  // without a second, unrelated query against the user table.
  email: string;
  completedFactors: string[];
  remainingFactors: string[];
  currentFactorExpectedCode?: string;
  // Set-Cookie header value(s) from the session Better Auth already
  // minted during Step 1's real signInEmail credential check - held
  // here, never sent to the client, until every remaining factor
  // passes. See app/api/auth/login-step1/route.ts's own comment for
  // why this project cannot use a "dontCreateSession" flag (it does
  // not exist on the installed better-auth version) or re-mint a
  // session via a public auth.api.createSession (also not exposed).
  pendingSessionCookies: string[];
  timestamp: number;
};

const mfaSessionCache = new LRUCache<string, MfaSessionState>({
  max: MFA_SESSION_CACHE_MAX_ENTRIES,
  ttl: MFA_SESSION_TTL_MS,
});

export function setMfaSession(
  pendingToken: string,
  state: MfaSessionState,
): void {
  mfaSessionCache.set(pendingToken, state);
}

export function getMfaSession(
  pendingToken: string,
): MfaSessionState | undefined {
  return mfaSessionCache.get(pendingToken);
}

export function deleteMfaSession(pendingToken: string): void {
  mfaSessionCache.delete(pendingToken);
}
