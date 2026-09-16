import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless bot-timing heuristic (docs/adr/0014, Option A) - a
// signed render timestamp embedded in a hidden form field on
// /sign-up, /log-in and /forget-password. A genuine human takes at
// least a perceptible amount of time to read the form and type into
// it; a scripted bot that fetches the page and immediately POSTs
// does not. Deliberately stateless (no database row per page render)
// so it costs nothing beyond the HMAC computation itself, unlike a
// server-issued nonce stored in the rate-limit table (Option B,
// rejected - see the ADR).
//
// This is independent of, and a fallback alongside, the Turnstile
// captcha plugin: Turnstile could in principle be down, misconfigured
// client-side, or defeated by a sophisticated bot that solves its
// challenge instantly - this check still catches the simpler,
// far-more-common case of a bot skipping the browser entirely and
// POSTing straight to the endpoint.
const MINIMUM_ELAPSED_MS = 1200;

// A render timestamp older than this is almost certainly a stale,
// reused page (e.g. a bot that fetched the form once and now replays
// the same token against many submissions) rather than a slow human -
// caps how long a single token can be reused.
const MAXIMUM_ELAPSED_MS = 30 * 60 * 1000;

function loadSecret(): Buffer {
  const secret = process.env.FORM_TIMING_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "FORM_TIMING_TOKEN_SECRET is not set - cannot sign or verify form timing tokens.",
    );
  }

  return Buffer.from(secret, "utf8");
}

function sign(timestamp: string): string {
  return createHmac("sha256", loadSecret()).update(timestamp).digest("base64url");
}

// Token format: "<renderedAtMs>.<hmac>" - a single opaque string
// suitable for a hidden <input type="hidden"> value.
export function createFormTimingToken(): string {
  const renderedAtMs = Date.now().toString();
  return `${renderedAtMs}.${sign(renderedAtMs)}`;
}

export type FormTimingCheck =
  | { valid: true }
  | { valid: false; reason: "malformed" | "signature-mismatch" | "too-fast" | "expired" };

export function verifyFormTimingToken(token: unknown): FormTimingCheck {
  if (typeof token !== "string") return { valid: false, reason: "malformed" };

  const [renderedAtMs, signature] = token.split(".");
  if (!renderedAtMs || !signature) return { valid: false, reason: "malformed" };

  const expectedSignature = sign(renderedAtMs);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  // Constant-time comparison - a naive === leaks timing information
  // about how many leading bytes matched, letting a determined
  // attacker guess the signature byte-by-byte.
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: "signature-mismatch" };
  }

  const elapsedMs = Date.now() - Number(renderedAtMs);
  if (elapsedMs < MINIMUM_ELAPSED_MS) return { valid: false, reason: "too-fast" };
  if (elapsedMs > MAXIMUM_ELAPSED_MS) return { valid: false, reason: "expired" };

  return { valid: true };
}
