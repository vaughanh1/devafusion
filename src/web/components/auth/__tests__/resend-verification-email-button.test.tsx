import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { sendVerificationEmailMock } = vi.hoisted(() => ({
  sendVerificationEmailMock: vi.fn(),
}));

vi.mock("@/features/auth/auth-client", () => ({
  authClient: {
    sendVerificationEmail: sendVerificationEmailMock,
  },
}));

import { ResendVerificationEmailButton } from "@/components/auth/resend-verification-email-button";

// Regression coverage for a real reported lockout: a user who lost
// or deleted their original verification email had no way back into
// their account at all. This component is the frontend half of the
// fix (auth.ts's onExistingUserSignUp handles the other half).
describe("ResendVerificationEmailButton", () => {
  afterEach(() => {
    cleanup();
    sendVerificationEmailMock.mockReset();
  });

  it("calls authClient.sendVerificationEmail with the given email on click", async () => {
    sendVerificationEmailMock.mockResolvedValue({ data: { status: true } });
    render(<ResendVerificationEmailButton email="ada@example.com" />);

    fireEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() =>
      expect(sendVerificationEmailMock).toHaveBeenCalledWith({
        email: "ada@example.com",
      }),
    );
  });

  it("shows a generic confirmation message after sending, not a distinct success/failure state", async () => {
    sendVerificationEmailMock.mockResolvedValue({ data: { status: true } });
    render(<ResendVerificationEmailButton email="ada@example.com" />);

    fireEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(
      await screen.findByText(/if an account needs verifying, a new link has been sent/i),
    ).toBeInTheDocument();
  });

  // Deliberately the SAME outcome as a successful send - per this
  // endpoint's own anti-enumeration design (confirmed directly
  // against the installed email-verification.mjs), a real failure
  // must be indistinguishable from "already verified"/"no such
  // account" to the caller. A distinct error message here would leak
  // exactly the information that constant-time floor exists to hide.
  it("shows the same generic confirmation even when the call rejects", async () => {
    sendVerificationEmailMock.mockRejectedValue(new Error("network down"));
    render(<ResendVerificationEmailButton email="ada@example.com" />);

    fireEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(
      await screen.findByText(/if an account needs verifying, a new link has been sent/i),
    ).toBeInTheDocument();
  });

  it("disables the button while the request is in flight", async () => {
    let resolveCall: (() => void) | undefined;
    sendVerificationEmailMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = () => resolve({ data: { status: true } });
      }),
    );
    render(<ResendVerificationEmailButton email="ada@example.com" />);

    fireEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();

    resolveCall?.();
    await waitFor(() =>
      expect(screen.queryByRole("button")).not.toBeInTheDocument(),
    );
  });
});
