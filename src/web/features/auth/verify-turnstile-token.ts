import "server-only";

// ADR-0014's own ipAddress/rate-limit caveat applies identically to
// Better Auth's captcha plugin: it runs as an onRequest hook on
// Better Auth's own router dispatch pipeline (the [...all] catch-all
// route), which auth.api.signInEmail() bypasses entirely when called
// directly from application code - confirmed by reading the
// installed better-auth@^1.7.5 captcha plugin source
// (plugins/captcha/index.mjs's onRequest hook, only ever invoked by
// the router, never by a direct auth.api.* call). login-step1's own
// route therefore verifies Turnstile itself, using the real
// siteverify endpoint the installed plugin itself calls
// (plugins/captcha/verify-handlers/cloudflare-turnstile.mjs) -
// https://challenges.cloudflare.com/turnstile/v0/siteverify, not the
// bare https://cloudflare.com host.
const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileSiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  captchaToken: string,
  remoteIp: string | undefined,
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "TURNSTILE_SECRET_KEY is not set - cannot verify a Turnstile token.",
    );
  }

  const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: secretKey,
      response: captchaToken,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    }),
  });

  if (!response.ok) return false;

  const result = (await response.json()) as TurnstileSiteverifyResponse;
  return result.success === true;
}
