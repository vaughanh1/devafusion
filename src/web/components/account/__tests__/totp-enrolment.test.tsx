import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

import { TotpEnrolment } from "@/components/account/totp-enrolment";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("TotpEnrolment", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  function stubFetch() {
    vi.stubGlobal("fetch", fetchMock);
  }

  it("renders the QR image with accessible alt text and the manual-entry secret once enrolment starts", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        qrCodeDataUri: "data:image/png;base64,abc123",
        manualEntrySecret: "JBSWY3DPEHPK3PXP",
        backupCodes: ["AAAA1111BBBB", "CCCC2222DDDD"],
      }),
    );
    render(<TotpEnrolment />);

    fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));

    const image = await screen.findByRole("img");
    expect(image).toHaveAttribute("alt", expect.stringContaining("JBSWY3DPEHPK3PXP"));
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
    expect(screen.getByText("AAAA1111BBBB")).toBeInTheDocument();
    expect(screen.getByText("CCCC2222DDDD")).toBeInTheDocument();
  });

  it("confirms enrolment and shows the success message", async () => {
    stubFetch();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          qrCodeDataUri: "data:image/png;base64,abc123",
          manualEntrySecret: "JBSWY3DPEHPK3PXP",
          backupCodes: ["AAAA1111BBBB"],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { enabled: true }));
    render(<TotpEnrolment />);

    fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));
    await screen.findByRole("img");

    fireEvent.change(screen.getByLabelText(/enter the 6-digit code/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm and enable/i }));

    expect(
      await screen.findByText(/authenticator app enabled/i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/two-factor/confirm",
      expect.objectContaining({
        body: JSON.stringify({ code: "123456" }),
      }),
    );
  });

  // Regression test for a real e2e-only failure (tests-e2e/mfa-flow.spec.ts):
  // this component is always mounted inside MfaSettingsDashboard's own
  // outer <form>, so rendering a second <form> here is invalid HTML - a
  // real browser click on the confirm button would submit the *outer*
  // form (a full page reload) instead of ever calling
  // /api/auth/two-factor/confirm. jsdom's fireEvent.click does not
  // reproduce that browser-level nested-form behaviour, which is why this
  // check has to assert structurally rather than via a click outcome.
  it("never renders a nested <form> around the confirmation step", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        qrCodeDataUri: "data:image/png;base64,abc123",
        manualEntrySecret: "JBSWY3DPEHPK3PXP",
        backupCodes: ["AAAA1111BBBB"],
      }),
    );
    render(<TotpEnrolment />);

    fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));
    await screen.findByRole("img");

    expect(document.querySelector("form")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm and enable/i }),
    ).toHaveAttribute("type", "button");
  });

  it("shows an error when starting enrolment fails", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse(500, { error: "Internal server error" }),
    );
    render(<TotpEnrolment />);

    fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Internal server error",
    );
  });

  it("prompts for the current password when the account already has a confirmed factor, then re-enrols", async () => {
    stubFetch();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(400, {
          error:
            "Your current password is required to reset an existing authenticator app.",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          qrCodeDataUri: "data:image/png;base64,abc123",
          manualEntrySecret: "JBSWY3DPEHPK3PXP",
          backupCodes: ["AAAA1111BBBB"],
        }),
      );
    render(<TotpEnrolment />);

    fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));

    const passwordField = await screen.findByLabelText(/current password/i);
    fireEvent.change(passwordField, { target: { value: "correct-horse-battery" } });
    fireEvent.click(
      screen.getByRole("button", { name: /confirm and replace authenticator app/i }),
    );

    await screen.findByRole("img");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/two-factor/enrol",
      expect.objectContaining({
        body: JSON.stringify({ password: "correct-horse-battery" }),
      }),
    );
  });

  it("shows an error when confirmation fails", async () => {
    stubFetch();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          qrCodeDataUri: "data:image/png;base64,abc123",
          manualEntrySecret: "JBSWY3DPEHPK3PXP",
          backupCodes: ["AAAA1111BBBB"],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(401, { error: "Invalid or expired code." }));
    render(<TotpEnrolment />);

    fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));
    await screen.findByRole("img");

    fireEvent.change(screen.getByLabelText(/enter the 6-digit code/i), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm and enable/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid or expired code."),
    );
  });

  // Regression tests for a real, reported account lockout
  // (MfaSettingsDashboard could previously save "totp" as a required
  // factor before it was ever genuinely confirmed) - these callbacks
  // are the signal MfaSettingsDashboard relies on to know the real,
  // server-side confirmation state.
  describe("onConfirmed / onEnrolmentStarted callbacks", () => {
    it("calls onEnrolmentStarted when a fresh secret is issued", async () => {
      stubFetch();
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          qrCodeDataUri: "data:image/png;base64,abc123",
          manualEntrySecret: "JBSWY3DPEHPK3PXP",
          backupCodes: ["AAAA1111BBBB"],
        }),
      );
      const onEnrolmentStarted = vi.fn();
      render(<TotpEnrolment onEnrolmentStarted={onEnrolmentStarted} />);

      fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));
      await screen.findByRole("img");

      expect(onEnrolmentStarted).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirmed only after a genuinely successful confirmation, not on failure", async () => {
      stubFetch();
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, {
            qrCodeDataUri: "data:image/png;base64,abc123",
            manualEntrySecret: "JBSWY3DPEHPK3PXP",
            backupCodes: ["AAAA1111BBBB"],
          }),
        )
        .mockResolvedValueOnce(jsonResponse(401, { error: "Invalid or expired code." }))
        .mockResolvedValueOnce(jsonResponse(200, { enabled: true }));
      const onConfirmed = vi.fn();
      render(<TotpEnrolment onConfirmed={onConfirmed} />);

      fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));
      await screen.findByRole("img");

      fireEvent.change(screen.getByLabelText(/enter the 6-digit code/i), {
        target: { value: "000000" },
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm and enable/i }));
      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      expect(onConfirmed).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText(/enter the 6-digit code/i), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /confirm and enable/i }));
      await screen.findByText(/authenticator app enabled/i);

      expect(onConfirmed).toHaveBeenCalledTimes(1);
    });
  });
});
