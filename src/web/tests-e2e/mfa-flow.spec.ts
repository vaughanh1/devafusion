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

    // requireEmailVerification (auth.ts) means sign-up itself never
    // mints a session - fetch and follow the real verification link
    // TEST_MFA_FLOWS makes auth.ts capture (test-verification-link-
    // cache.ts), same as sign-up.spec.ts's identical step, since
    // this account also needs a real session before TOTP enrolment
    // below can proceed.
    await expect(page.getByText(/check your inbox at/i)).toBeVisible();
    const linkResponse = await page.request.get(
      `/api/test-only/verification-link?email=${encodeURIComponent(email)}`,
    );
    expect(linkResponse.ok()).toBe(true);
    const { url: verificationUrl } = await linkResponse.json();
    expect(verificationUrl).toBeTruthy();
    await page.goto(verificationUrl);
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

  // Regression test for a real, reported lockout: checking "trust
  // this device" at MFA-challenge time created a genuinely valid
  // trusted_devices row, but login-step1.ts only ever consults it
  // when user_security.mfa_frequency is '30_days' - that column was
  // previously never set by this path, so the device was challenged
  // again on every subsequent login regardless, with no error or
  // indication that anything had gone wrong.
  test("checking 'trust this device' during an MFA challenge is honoured on the next login", async ({
    page,
  }) => {
    test.skip(
      !shouldRun,
      "Requires a real Postgres connection (TEST_MFA_FLOWS=true) - no CI sandbox wired up yet.",
    );

    const email = `mfa-trust-${Date.now()}@example.com`;
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

    await page.goto("/account");
    await page.getByRole("button", { name: /set up authenticator app/i }).click();
    const manualSecret = await page
      .getByText(/^[A-Z2-7]{16,}$/)
      .first()
      .textContent();
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(manualSecret!) });
    await page
      .getByLabel(/enter the 6-digit code from your authenticator app to finish/i)
      .fill(totp.generate());
    await page.getByRole("button", { name: /confirm and enable/i }).click();
    await expect(page.getByText(/authenticator app enabled/i)).toBeVisible();

    // Log out, log back in, and this time check "trust this device"
    // on the MFA challenge form itself (not the settings dashboard's
    // own separate radio button - the two are deliberately exercised
    // as distinct entry points to the same underlying setting).
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
    await page.getByLabel(/trust this device for 30 days/i).check();
    await page.getByRole("button", { name: /verify/i }).click();
    await expect(page).not.toHaveURL(/\/log-in/);

    // Log out again and log back in a THIRD time - the real
    // assertion. Before this fix, the trusted-device cookie/row
    // existed but mfa_frequency stayed "always", so this would still
    // show the TOTP challenge again. After the fix, this device is
    // genuinely trusted and skips straight past it.
    await page.getByRole("button", { name: /log out/i }).click();
    await page.goto("/log-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await expect(
      page.getByRole("button", { name: /log in/i }),
    ).toBeEnabled({ timeout: 15_000 });
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).not.toHaveURL(/\/log-in/);
    await expect(
      page.getByLabel(/enter the 6-digit code from your authenticator app/i),
    ).not.toBeVisible();
  });

  // Regression test for a real, reported account lockout: nothing
  // previously stopped a user from selecting "Authenticator App
  // (TOTP)" and saving it as their required factor WITHOUT ever
  // confirming a real code - the account then required a factor
  // with no working secret behind it, an unrecoverable lockout with
  // no error at save time to explain why. This is the exact
  // reported repro sequence: enrol for Email OTP first, log out/in
  // once, THEN visit /account and select TOTP without ever
  // confirming it.
  test("selecting Authenticator App without confirming it cannot be saved, and the account is never locked out", async ({
    page,
  }) => {
    test.skip(
      !shouldRun,
      "Requires a real Postgres connection (TEST_MFA_FLOWS=true) - no CI sandbox wired up yet.",
    );

    const email = `mfa-unconfirmed-totp-${Date.now()}@example.com`;
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

    // First, genuinely enrol for Email OTP (the reported repro's own
    // first step) - avoids TOTP entirely on this first save.
    await page.getByLabel(/^email otp$/i).check();
    await page.getByLabel(/i understand and accept this risk/i).check();
    await page.getByLabel(/confirm your password to save/i).fill(password);
    await page.getByRole("button", { name: /save security settings/i }).click();
    await expect(
      page.getByText(/your security settings have been saved/i),
    ).toBeVisible();

    // Now, WITHOUT ever starting or confirming TOTP enrolment,
    // select "Authenticator App" - the exact reported gap.
    await page.getByLabel(/^authenticator app \(totp\)$/i).check();
    await page.getByLabel(/confirm your password to save/i).fill(password);

    await expect(
      page.getByText(/authenticator app is not yet confirmed/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save security settings/i }),
    ).toBeDisabled();

    // The account must remain fully usable - re-fetching the page
    // and logging out/in again must not be affected by the blocked
    // (never persisted) save attempt above.
    await page.goto("/account");
    await page.getByRole("button", { name: /log out/i }).click();
    await page.goto("/log-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await expect(
      page.getByRole("button", { name: /log in/i }),
    ).toBeEnabled({ timeout: 15_000 });
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).not.toHaveURL(/\/log-in/);
  });
});
