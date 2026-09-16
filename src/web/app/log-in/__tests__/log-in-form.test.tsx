import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above top-level variable declarations,
// so the mock functions they reference must be created via vi.hoisted
// rather than a plain const.
const { pushMock, refreshMock, signInEmailMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signInEmailMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/features/auth/auth-client", () => ({
  authClient: {
    signIn: {
      email: signInEmailMock,
    },
  },
}));

// ADR-0014: see sign-up-form.test.tsx's identical comment.
vi.mock("@/components/auth/turnstile-widget", () => ({
  TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => {
    React.useEffect(() => {
      onToken("test-captcha-token");
    }, [onToken]);
    return null;
  },
}));

import { LogInForm } from "@/app/log-in/log-in-form";

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "correct-horse-battery" },
  });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));
}

describe("LogInForm", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
    refreshMock.mockReset();
    signInEmailMock.mockReset();
  });

  it("redirects to the given path on a successful log-in", async () => {
    signInEmailMock.mockResolvedValue({ data: {}, error: null });
    render(<LogInForm redirectPath="/log" formTimingToken="test-token" />);

    fillAndSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/log"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("passes the redirect path through as callbackURL", async () => {
    signInEmailMock.mockResolvedValue({ data: {}, error: null });
    render(<LogInForm redirectPath="/projects" formTimingToken="test-token" />);

    fillAndSubmit();

    await waitFor(() =>
      expect(signInEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({ callbackURL: "/projects" }),
      ),
    );
  });

  it("shows a single generic message on invalid credentials, not Better Auth's own message", async () => {
    signInEmailMock.mockResolvedValue({
      data: null,
      error: { message: "No user found for this email." },
    });
    render(<LogInForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password.");
    expect(alert).not.toHaveTextContent("No user found");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic error when the request throws", async () => {
    signInEmailMock.mockRejectedValue(new Error("network down"));
    render(<LogInForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });
});
