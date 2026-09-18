import { expect, test } from "@playwright/test";
import * as OTPAuth from "otpauth";

// Exercises the real, full MFA matrix end-to-end: sign up, enrol TOTP
// (fetching the real otpauth:// secret from the API - the QR image
// itself is not scanned by this test, only the manual-entry secret
// alongside it, which is exactly the accessible fallback this slice
// added for anyone who cannot scan a QR code), confirm enrolment with
// a real otpauth-generated code, then log back in and pass the
// sequential-matrix challenge with a fresh code. Gated behind
// TEST_MFA_FLOWS (src/web/__tests__/AGENTS.md's documented toggle) -
// runs for real against pipelines/ci/web.yml's E2ETests job's own
// postgres service container when enabled from the "Run Pipeline"
// variables panel, same gating pattern sign-up.spec.ts already
// established for TEST_DB_ACTIONS. Defaults to false so this suite
// never writes real rows on an ordinary PR run.
const shouldRun = process.env.TEST_MFA_FLOWS === "true";

test.describe("MFA matrix", () => {
  test("enrols TOTP, confirms it, and challenges it on the next login", async ({ page }) => {
    test.skip(
      !shouldRun,
      "Requires a real Postgres connection (TEST_MFA_FLOWS=true) - no CI sandbox wired up yet.",
    );

    const email = `mfa-${Date.now()}@example.com`;
    const password = "Correct-Horse-Battery-9!";

    // Sign up (password-only, no MFA enrolled yet).
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeEnabled({ timeout: 15_000 });
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).not.toHaveURL(/\/sign-up/);

    // Enrol TOTP from the account settings dashboard.
    await page.goto("/account");
    await page.getByRole("button", { name: /set up authenticator app/i }).click();

    // The manual-entry secret is the same accessible fallback a real
    // user without a camera/QR scanner relies on - reading it here
    // (rather than decoding the QR image) proves that fallback
    // actually contains a working secret, not just placeholder text.
    const manualSecret = await page
      .getByText(/^[A-Z2-7]{16,}$/)
      .first()
      .textContent();
    expect(manualSecret).toBeTruthy();

    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(manualSecret!) });
    await page
      .getByLabel(/enter the 6-digit code from your authenticator app to finish/i)
      .fill(totp.generate());
    await page.getByRole("button", { name: /confirm and enable/i }).click();
    await expect(page.getByText(/authenticator app enabled/i)).toBeVisible();

    // Log out, then log back in - this account now requires
    // ['password', 'totp'], so login-step1 must return mfaRequired.
    await page.getByRole("button", { name: /log out/i }).click();
    await page.goto("/log-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await expect(
      page.getByRole("button", { name: /log in/i }),
    ).toBeEnabled({ timeout: 15_000 });
    await page.getByRole("button", { name: /log in/i }).click();

    const challengeField = page.getByLabel(
      /enter the 6-digit code from your authenticator app/i,
    );
    await expect(challengeField).toBeVisible();
    await challengeField.fill(totp.generate());
    await page.getByRole("button", { name: /verify/i }).click();

    await expect(page).not.toHaveURL(/\/log-in/);
  });
});
