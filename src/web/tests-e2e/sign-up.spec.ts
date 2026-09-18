import { expect, test } from "@playwright/test";

// ADR-0014: exercises the real sign-up flow end-to-end, including the
// real Turnstile widget (Cloudflare's documented dummy "always passes"
// sitekey/secretKey pair, wired into playwright.config.ts's webServer
// env - see that file's comment) and the real form-timing-token hook,
// rather than mocking either. This is deliberately the one E2E spec
// that proves the client (TurnstileWidget's actual render() call,
// size/appearance config included) and server (auth.ts's hooks.before,
// the captcha plugin's real /siteverify call to Cloudflare) are wired
// together correctly - the unit test suite mocks TurnstileWidget
// entirely (app/sign-up/__tests__/sign-up-form.test.tsx), so this is
// the only place that would actually catch a wiring regression between
// the two.
//
// The successful-sign-up test genuinely writes a user row via
// auth.api.signUpEmail -> Drizzle -> DATABASE_URL.
// pipelines/ci/web.yml's E2ETests job wires up a real postgres
// service container (same resources.containers: postgres the
// LighthouseCI job also uses) and migrates it before Playwright
// starts, so this connection has somewhere real to reach when run
// there. Gated behind TEST_DB_ACTIONS (src/web/__tests__/AGENTS.md's
// documented toggle, enabled from the "Run Pipeline" variables panel)
// so this suite defaults to off and never writes real rows on an
// ordinary PR run. The password-toggle test below needs no database
// and always runs.
const shouldRunDbTests = process.env.TEST_DB_ACTIONS === "true";

test.describe("sign-up", () => {
  test("enables submit only after Turnstile's dummy widget reports success, and account creation succeeds", async ({
    page,
  }) => {
    test.skip(
      !shouldRunDbTests,
      "Requires a real Postgres connection (TEST_DB_ACTIONS=true) - no CI sandbox wired up yet.",
    );

    await page.goto("/sign-up");

    const submitButton = page.getByRole("button", { name: /create account/i });

    // Disabled immediately after load - no captcha token yet, and the
    // real form-timing-token check would also reject a same-tick
    // submission (MINIMUM_ELAPSED_MS = 1200ms in
    // features/auth/form-timing-token.ts) even if it could be clicked.
    await expect(submitButton).toBeDisabled();

    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(`ada-${Date.now()}@example.com`);
    // exact: true - PasswordField's reveal button carries
    // aria-label="Show password", and Playwright's getByLabel does
    // substring matching by default, so an unqualified "Password"
    // query is a strict-mode violation matching both the input and
    // the button (confirmed by actually running this spec).
    // ADR-0014: must satisfy features/auth/password-strength.ts's
    // rule (length + upper/lower/number/special) - the submit button
    // stays disabled otherwise, per sign-up-form.tsx's own client-side
    // gate, independent of the Turnstile token below.
    await page.getByLabel("Password", { exact: true }).fill("Correct-Horse-Battery-9!");

    // Cloudflare's dummy "always passes" widget still runs a real
    // (fast) round trip before invoking the success callback that sets
    // captchaToken - waiting for the button to become enabled is the
    // actual proof that TurnstileWidget's render() call, callback
    // wiring, and the parent form's disabled={isSubmitting ||
    // !captchaToken} logic all work end-to-end.
    await expect(submitButton).toBeEnabled({ timeout: 15_000 });

    await submitButton.click();

    // A successful sign-up redirects away from /sign-up (default
    // redirectPath is "/" per resolveSafeRedirectPath's fallback).
    await expect(page).not.toHaveURL(/\/sign-up/);
  });

  test("shows the show/hide password toggle and reveals the typed value", async ({
    page,
  }) => {
    await page.goto("/sign-up");

    const passwordField = page.getByLabel("Password", { exact: true });
    await passwordField.fill("correct-horse-battery-staple");
    await expect(passwordField).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(passwordField).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(passwordField).toHaveAttribute("type", "password");
  });
});
