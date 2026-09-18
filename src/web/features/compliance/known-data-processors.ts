// Registry of every third-party data processor this codebase actually
// calls, cross-checked against /legal by
// __tests__/legal-disclosure-coverage.test.ts. Each entry's
// sourceSignatures are literal strings that only appear in source
// when that processor is genuinely being called (an import specifier
// or an outbound hostname) - not a heuristic, an exact match against
// real call sites.
//
// What this catches: a new processor call-site added anywhere in
// src/web with no entry here (the test fails, forcing a decision
// before merge, not after a PR review misses it) or an existing
// entry whose requiredLegalText no longer appears verbatim on
// /legal (the disclosure was deleted or reworded without the
// registry being updated to match).
//
// What this does NOT catch: whether the *purpose* described in
// /legal's prose is still accurate (e.g. "this ACS call is only for
// MFA" quietly becoming false when a second, unrelated ACS call site
// is added under an already-covered signature). That is a semantic
// judgement, not a mechanical one - no automated tool, including the
// commercial cookie/tracker scanners this registry was written in
// response to, can verify prose accuracy against code intent. This
// is exactly why root AGENTS.md's Log-Driven Development rule
// requires a written log entry, reviewed before push, for every
// feature that changes an established pattern - that review step is
// the actual backstop for the part this registry structurally
// cannot automate. When adding a new call site under an *existing*
// signature (e.g. a second ACS send for a new purpose), updating
// requiredLegalText here to reflect the new scope is a deliberate,
// required step of that same change, not optional follow-up.
export type KnownDataProcessor = {
  name: string;
  sourceSignatures: string[];
  requiredLegalText: string[];
};

export const knownDataProcessors: KnownDataProcessor[] = [
  {
    name: "Azure Communication Services (email)",
    sourceSignatures: ["@azure/communication-email"],
    requiredLegalText: ["Azure Communication Services"],
  },
  {
    name: "Google Analytics 4",
    sourceSignatures: ["@next/third-parties/google"],
    requiredLegalText: ["Google Analytics"],
  },
  {
    name: "Cloudflare Turnstile",
    sourceSignatures: ["cloudflare-turnstile", "challenges.cloudflare.com"],
    requiredLegalText: ["Cloudflare Turnstile", "Turnstile"],
  },
];
