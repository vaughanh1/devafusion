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
const { pushMock, refreshMock, signUpEmailMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signUpEmailMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/features/auth/auth-client", () => ({
  authClient: {
    signUp: {
      email: signUpEmailMock,
    },
  },
}));

// ADR-0014: TurnstileWidget depends on window.turnstile/next/script,
// neither of which function meaningfully in jsdom - stubbed to
// immediately report a fixed token, mirroring how a solved challenge
// looks to the form. Turnstile's own client behaviour is Cloudflare's
// to test, not this project's.
vi.mock("@/components/auth/turnstile-widget", () => ({
  TurnstileWidget: ({ onToken }: { onToken: (token: string) => void }) => {
    // useEffect, not a synchronous render-time call - calling a
    // parent's setState directly during another component's render
    // triggers a React warning.
    React.useEffect(() => {
      onToken("test-captcha-token");
    }, [onToken]);
    return null;
  },
}));

import { SignUpForm } from "@/app/sign-up/sign-up-form";

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Ada Lovelace" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "correct-horse-battery" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create account/i }));
}

describe("SignUpForm", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
    refreshMock.mockReset();
    signUpEmailMock.mockReset();
  });

  it("redirects to the given path on a successful sign-up", async () => {
    signUpEmailMock.mockResolvedValue({ data: {}, error: null });
    render(<SignUpForm redirectPath="/log" formTimingToken="test-token" />);

    fillAndSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/log"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("passes the redirect path through as callbackURL", async () => {
    signUpEmailMock.mockResolvedValue({ data: {}, error: null });
    render(<SignUpForm redirectPath="/projects" formTimingToken="test-token" />);

    fillAndSubmit();

    await waitFor(() =>
      expect(signUpEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({ callbackURL: "/projects" }),
      ),
    );
  });

  it("shows the server-provided error message and does not redirect", async () => {
    signUpEmailMock.mockResolvedValue({
      data: null,
      error: { message: "Email already in use." },
    });
    render(<SignUpForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email already in use.",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic error when the request throws", async () => {
    signUpEmailMock.mockRejectedValue(new Error("network down"));
    render(<SignUpForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });
});
