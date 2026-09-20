import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

// TotpEnrolment makes its own fetch calls when "totp" is selected
// (the default) - mocked out here since this suite is only
// responsible for the settings-save flow itself, matching the
// locality convention already established for MfaChallengeForm's
// own test mocking sibling components' network calls.
vi.mock("@/components/account/totp-enrolment", () => ({
  TotpEnrolment: () => null,
}));

import { MfaSettingsDashboard } from "@/components/account/mfa-settings-dashboard";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("MfaSettingsDashboard", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  function stubFetch() {
    vi.stubGlobal("fetch", fetchMock);
  }

  it("disables save until a password is entered, for the default (TOTP) selection", () => {
    render(<MfaSettingsDashboard initialTotpConfirmed />);

    expect(screen.getByRole("button", { name: /save security settings/i })).toBeDisabled();
  });

  // Regression test for a real, reported account lockout: this
  // gate previously did not exist at all - a fresh account (no
  // confirmed TOTP yet) could save "totp" as its required factor
  // with the password field alone, ending up locked out on the next
  // login with no working secret behind that requirement.
  it("disables save for the default (TOTP) selection when TOTP has not been confirmed, even with a password entered", () => {
    render(<MfaSettingsDashboard />);

    fireEvent.change(screen.getByLabelText(/confirm your password/i), {
      target: { value: "correct-horse-battery" },
    });

    expect(screen.getByRole("button", { name: /save security settings/i })).toBeDisabled();
    expect(
      screen.getByText(/authenticator app is not yet confirmed/i),
    ).toBeInTheDocument();
  });

  it("does not show the risk warning for the default TOTP selection", () => {
    render(<MfaSettingsDashboard />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the risk warning and requires acknowledgement for a weaker selection", () => {
    render(<MfaSettingsDashboard />);

    fireEvent.click(screen.getByLabelText("Email OTP"));

    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/confirm your password/i), {
      target: { value: "correct-horse-battery" },
    });
    expect(screen.getByRole("button", { name: /save security settings/i })).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/i understand and accept this risk/i));
    expect(screen.getByRole("button", { name: /save security settings/i })).toBeEnabled();
  });

  it("posts the expected payload and shows a success message on save", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(200, { updated: true }));
    render(<MfaSettingsDashboard initialTotpConfirmed />);

    fireEvent.change(screen.getByLabelText(/confirm your password/i), {
      target: { value: "correct-horse-battery" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save security settings/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/user/security/settings");
    expect(JSON.parse(options.body)).toEqual({
      password: "correct-horse-battery",
      requiredFactors: ["password", "totp"],
      mfaFrequency: "always",
      riskAcknowledged: undefined,
    });

    expect(
      await screen.findByText(/your security settings have been saved/i),
    ).toBeInTheDocument();
  });

  it("shows the server's error message when saving fails", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Incorrect password." }));
    render(<MfaSettingsDashboard initialTotpConfirmed />);

    fireEvent.change(screen.getByLabelText(/confirm your password/i), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save security settings/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect password.");
  });

  // Regression tests for a real, reported bug: this page previously
  // always mounted with hardcoded defaults (selectedFactor "totp",
  // mfaFrequency "always") regardless of what was actually saved for
  // the account - every visit looked identically unconfigured.
  describe("initial state derived from real saved settings", () => {
    it("selects Email OTP when the saved requiredFactors is ['password', 'email']", () => {
      render(<MfaSettingsDashboard initialRequiredFactors={["password", "email"]} />);

      expect(screen.getByLabelText("Email OTP")).toBeChecked();
      expect(screen.getByLabelText("Authenticator App (TOTP)")).not.toBeChecked();
    });

    it("selects None when the saved requiredFactors is ['password']", () => {
      render(<MfaSettingsDashboard initialRequiredFactors={["password"]} />);

      expect(screen.getByLabelText("None")).toBeChecked();
    });

    it("selects Every sign-in vs Trust this device based on the saved mfaFrequency", () => {
      render(<MfaSettingsDashboard initialMfaFrequency="30_days" />);

      expect(screen.getByLabelText(/trust this device for 30 days/i)).toBeChecked();
      expect(screen.getByLabelText(/every sign-in/i)).not.toBeChecked();
    });

    it("shows the TOTP-confirmed status message when initialTotpConfirmed is true", () => {
      render(
        <MfaSettingsDashboard
          initialRequiredFactors={["password", "totp"]}
          initialTotpConfirmed
        />,
      );

      expect(
        screen.getByText(/authenticator app is confirmed and active/i),
      ).toBeInTheDocument();
    });

    it("shows the not-yet-confirmed status message when TOTP is selected but not confirmed", () => {
      render(<MfaSettingsDashboard initialRequiredFactors={["password", "totp"]} />);

      expect(
        screen.getByText(/authenticator app is not yet confirmed/i),
      ).toBeInTheDocument();
    });

    it("falls back to the schema default (TOTP, always) when no saved settings are passed at all", () => {
      render(<MfaSettingsDashboard />);

      expect(screen.getByLabelText("Authenticator App (TOTP)")).toBeChecked();
      expect(screen.getByLabelText(/every sign-in/i)).toBeChecked();
    });
  });
});
