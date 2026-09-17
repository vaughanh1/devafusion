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

  it("shows an error when starting enrolment fails", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: "Two-factor authentication is already enabled for this account." }),
    );
    render(<TotpEnrolment />);

    fireEvent.click(screen.getByRole("button", { name: /set up authenticator app/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Two-factor authentication is already enabled for this account.",
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
});
