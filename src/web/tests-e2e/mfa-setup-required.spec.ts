import { expect, test } from "@playwright/test";
import * as OTPAuth from "otpauth";

// Gated behind TEST_DB_ACTIONS/TEST_MFA_FLOWS (src/web/__tests__/
// AGENTS.md's documented toggles), same pattern as sign-up.spec.ts
// and mfa-flow.spec.ts - real Postgres writes, never on an ordinary
// PR run.
const shouldRun =
  process.env.TEST_DB_ACTIONS === "true" || process.env.TEST_MFA_FLOWS === "true";

// proxy.ts's own enforcement: a signed-in account with no genuinely
// completed user_security choice must be redirected to /mfa-setup on
// every route, not merely shown a dashboard banner it can navigate
// past - the exact parity with requireEmailVerification (auth.ts)
// this slice exists to establish. Covers the real gap found in the
// same session this spec was added: starting TOTP enrolment (a real
// user_security row now exists) is NOT the same as completing it -
// twoFactorEnabled only flips to true once /api/auth/two-factor/
// confirm succeeds, and the redirect must still fire in between.
test.describe("mandatory MFA setup", () => {
  test("redirects every route to /mfa-setup until a second factor is genuinely confirmed", async ({
    page,
  }) => {
    test.skip(
      !shouldRun,
      "Requires a real Postgres connection (TEST_DB_ACTIONS or TEST_MFA_FLOWS=true) - no CI sandbox wired up yet.",
    );

    const email = `mfa-setup-required-${Date.now()}@example.com`;
    const password = "Correct-Horse-Battery-9!";

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeEnabled({ timeout: 15_000 });
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/check your inbox at/i)).toBeVisible();

    const linkResponse = await page.request.get(
      `/api/test-only/verification-link?email=${encodeURIComponent(email)}`,
    );
    const { url: verificationUrl } = await linkResponse.json();
    await page.goto(verificationUrl);

    // A freshly verified account has no user_security row at all yet
    // - every page other than /mfa-setup itself must redirect there.
    await page.goto("/");
    await expect(page).toHaveURL(/\/mfa-setup/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/mfa-setup/);

    // Start TOTP enrolment from THIS page (not /account, which the
    // proxy no longer lets an unenrolled account reach) - a real
    // user_security row now exists, but unconfirmed. Explicit goto
    // rather than relying on the prior redirect having landed here,
    // since the two checks above each navigate away first.
    await page.goto("/mfa-setup");
    await page.getByRole("button", { name: /set up authenticator app/i }).click();
    await expect(
      page.getByText(/scan this qr code with your authenticator app/i),
    ).toBeVisible();

    // The new otpauth:// deep link and "start over" control this
    // slice added - both must be present and the link must carry a
    // real otpauth:// URI, not a placeholder.
    const deepLink = page.getByRole("link", {
      name: /open in your authenticator app/i,
    });
    await expect(deepLink).toBeVisible();
    await expect(deepLink).toHaveAttribute("href", /^otpauth:\/\//);
    await expect(
      page.getByRole("button", { name: /start over with a new qr code/i }),
    ).toBeVisible();

    const manualSecret = await page
      .getByText(/^[A-Z2-7]{16,}$/)
      .first()
      .textContent();

    // STILL redirected everywhere else - an unconfirmed secret must
    // never unlock access, exactly the gap this spec exists to prove
    // is closed. Checked from a SEPARATE page sharing the same
    // storage state, not by navigating the original page away and
    // back - the QR/secret/backup-codes returned by /enrol only ever
    // live in this component's own client-side React state (never
    // persisted for redisplay), so navigating the original page away
    // would reset it to "idle" and lose the in-progress code needed
    // below, independent of whether the redirect assertion itself is
    // correct.
    const secondPage = await page.context().newPage();
    await secondPage.goto("/");
    await expect(secondPage).toHaveURL(/\/mfa-setup/);
    await secondPage.close();

    // Back on the original page's still-live "scanning" state, finish
    // confirming.
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(manualSecret!) });
    await page
      .getByLabel(/enter the 6-digit code from your authenticator app to finish/i)
      .fill(totp.generate());
    await page.getByRole("button", { name: /confirm and enable/i }).click();
    await expect(page.getByText(/authenticator app enabled/i)).toBeVisible();

    // Setup is now genuinely complete - every route is reachable.
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/mfa-setup/);
    await page.goto("/account");
    await expect(page).not.toHaveURL(/\/mfa-setup/);
  });

  test("Email OTP, with no confirmation step, unlocks access as soon as it is saved", async ({
    page,
  }) => {
    test.skip(
      !shouldRun,
      "Requires a real Postgres connection (TEST_DB_ACTIONS or TEST_MFA_FLOWS=true) - no CI sandbox wired up yet.",
    );

    const email = `mfa-setup-email-otp-${Date.now()}@example.com`;
    const password = "Correct-Horse-Battery-9!";

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Grace Hopper");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeEnabled({ timeout: 15_000 });
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/check your inbox at/i)).toBeVisible();

    const linkResponse = await page.request.get(
      `/api/test-only/verification-link?email=${encodeURIComponent(email)}`,
    );
    const { url: verificationUrl } = await linkResponse.json();
    await page.goto(verificationUrl);
    await expect(page).toHaveURL(/\/mfa-setup/);

    await page.getByLabel(/email otp/i).check();
    // Email OTP is weaker than the default ['password', 'totp']
    // policy (mfa-settings-dashboard.tsx's WEAKER_OPTIONS) - the risk
    // acknowledgement checkbox must be ticked before the save button
    // unlocks, same as the account settings page's existing behaviour.
    await page.getByLabel(/i understand and accept this risk/i).check();
    await page.getByLabel(/confirm your password to save/i).fill(password);
    await page.getByRole("button", { name: /save security settings/i }).click();
    await expect(page.getByText(/your security settings have been saved/i)).toBeVisible();

    // No confirmation step exists for Email OTP - saving alone must
    // be sufficient to unlock access, unlike the TOTP path above.
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/mfa-setup/);
  });
});
