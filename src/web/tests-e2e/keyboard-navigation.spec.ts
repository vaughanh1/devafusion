import { expect, test } from "@playwright/test";

// @a11y — same tagging discipline as accessibility.spec.ts's own
// comment (a distinct grep tag, no dedicated Playwright config/
// project needed; pipelines/ci/web.yml's E2ETests job runs `npx
// playwright test` with no --grep filter, so this already runs
// there). axe-core (accessibility.spec.ts) only checks static/
// structural WCAG rules - an element is reachable, has a visible
// focus indicator, isn't a negative-tabindex trap - it never actually
// drives a keyboard through a real form and presses Enter to submit.
// This spec is the one place that proves a user really can tab
// through sign-up/log-in/reset-password in a logical order and
// submit with Enter, matching WCAG 2.1 SC 2.1.1 (Keyboard) and SC
// 2.4.3 (Focus Order), not just SC 2.4.7 (Focus Visible).
//
// Each field walk starts from an explicit .focus() on the field
// itself (Playwright's own recommended pattern for "position the
// cursor here, then test relative Tab order") rather than counting a
// fixed number of Tab presses from page load - the exact number of
// focusable elements before the form (header nav, etc.) is a layout
// detail this spec should not be coupled to; what WCAG SC 2.4.3
// actually requires is that the sequence AFTER a field is reached is
// logical, which this proves without that coupling.
//
// The sign-up/log-in tab-order assertions deliberately stop short of
// actually submitting - Cloudflare's Turnstile widget still runs a
// real (if fast) background round trip even with the dummy always-
// passes key, which this sandbox has observed as flaky independently
// of any change here (sign-up.spec.ts's own Turnstile-dependent test
// exercises that exact submission path already). The Enter-actually-
// submits proof below uses reset-password-form.tsx instead, which
// has no Turnstile dependency at all, so it is not coupled to that
// separate flakiness.
test.describe("keyboard-only navigation @a11y", () => {
  test("sign-up form's fields are reachable in a logical Tab order", async ({ page }) => {
    await page.goto("/sign-up");

    await page.getByLabel("Name").focus();
    await expect(page.getByLabel("Name")).toBeFocused();
    await page.keyboard.type("Ada Lovelace");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Email")).toBeFocused();
    await page.keyboard.type("ada@example.com");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
    await page.keyboard.type("Correct-Horse-Battery-9!");

    // Tabbing past the password field reaches its own reveal toggle
    // next (password-field.tsx's markup order) before anything else -
    // this button's type="button", not "submit", so it must not be
    // mistaken for the actual submit control.
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Show password" }),
    ).toBeFocused();
  });

  test("log-in form's fields are reachable in a logical Tab order", async ({ page }) => {
    await page.goto("/log-in");

    await page.getByLabel("Email").focus();
    await expect(page.getByLabel("Email")).toBeFocused();
    await page.keyboard.type("ada@example.com");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
    await page.keyboard.type("some-password-9!");

    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Show password" }),
    ).toBeFocused();
  });

  // A deliberately invalid/expired token is enough here - the point
  // is proving Enter on a focused submit button triggers the real
  // client-side onSubmit handler and a real network request, not
  // that the reset itself succeeds (already covered elsewhere by
  // this project's real backend logic, not by keyboard behaviour).
  test("reset-password form can be completed and submitted using only Tab and Enter", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=deliberately-invalid-token-for-keyboard-test");

    await page.getByLabel("New password").focus();
    await expect(page.getByLabel("New password")).toBeFocused();
    await page.keyboard.type("Correct-Horse-Battery-9!");

    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Show password" }),
    ).toBeFocused();

    await page.keyboard.press("Tab");
    const submitButton = page.getByRole("button", { name: /reset password/i });
    await expect(submitButton).toBeFocused();

    await page.keyboard.press("Enter");

    // Better Auth's own resetPassword rejects an invalid/expired
    // token - reaching this real, server-returned error alert proves
    // Enter triggered the actual onSubmit handler and a real network
    // round trip, not a client-side no-op.
    await expect(page.getByRole("alert")).toBeVisible();
  });
});
