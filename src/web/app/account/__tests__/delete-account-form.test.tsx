import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above top-level variable declarations,
// so the mock functions they reference must be created via
// vi.hoisted rather than a plain const.
const { pushMock, refreshMock, deleteUserMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  deleteUserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/features/auth/auth-client", () => ({
  authClient: {
    deleteUser: deleteUserMock,
  },
}));

import { DeleteAccountForm } from "@/app/account/delete-account-form";

function fillPassword(value: string) {
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value },
  });
}

function fillConfirmation(value: string) {
  fireEvent.change(screen.getByLabelText(/type "delete my account"/i), {
    target: { value },
  });
}

describe("DeleteAccountForm", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
    refreshMock.mockReset();
    deleteUserMock.mockReset();
  });

  it("blocks submission until the confirmation phrase is typed exactly", () => {
    render(<DeleteAccountForm />);

    fillPassword("correct-horse-battery");
    fillConfirmation("not the phrase");

    expect(
      screen.getByRole("button", { name: /permanently delete my account/i }),
    ).toBeDisabled();
  });

  it("calls authClient.deleteUser with the password and redirects home on success", async () => {
    deleteUserMock.mockResolvedValue({ data: {}, error: null });
    render(<DeleteAccountForm />);

    fillPassword("correct-horse-battery");
    fillConfirmation("delete my account");
    fireEvent.click(
      screen.getByRole("button", { name: /permanently delete my account/i }),
    );

    await waitFor(() =>
      expect(deleteUserMock).toHaveBeenCalledWith({
        password: "correct-horse-battery",
      }),
    );
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows the returned error message and does not redirect on failure", async () => {
    deleteUserMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid password." },
    });
    render(<DeleteAccountForm />);

    fillPassword("wrong-password");
    fillConfirmation("delete my account");
    fireEvent.click(
      screen.getByRole("button", { name: /permanently delete my account/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid password.",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic error when the request throws", async () => {
    deleteUserMock.mockRejectedValue(new Error("network down"));
    render(<DeleteAccountForm />);

    fillPassword("correct-horse-battery");
    fillConfirmation("delete my account");
    fireEvent.click(
      screen.getByRole("button", { name: /permanently delete my account/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });
});
