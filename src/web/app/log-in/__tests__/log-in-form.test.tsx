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
const { pushMock, refreshMock, fetchMock, turnstileResetMock, notifySessionChangedMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    fetchMock: vi.fn(),
    turnstileResetMock: vi.fn(),
    notifySessionChangedMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

// login-step1 mints a real session outside authClient's own dispatch
// (auth-client.ts's own comment) - LogInForm must nudge
// authClient.useSession()'s nanostore or the header keeps showing
// stale logged-out state after a real successful login.
vi.mock("@/features/auth/auth-client", () => ({
  notifySessionChanged: notifySessionChangedMock,
}));

// ADR-0014: see sign-up-form.test.tsx's identical comment.
vi.mock("@/components/auth/turnstile-widget", () => ({
  TurnstileWidget: ({
    onToken,
    handleRef,
  }: {
    onToken: (token: string) => void;
    handleRef?: React.RefObject<{ reset: () => void } | null>;
  }) => {
    React.useEffect(() => {
      onToken("test-captcha-token");
      if (handleRef) handleRef.current = { reset: turnstileResetMock };
    }, [onToken, handleRef]);
    return null;
  },
}));

import { LogInForm } from "@/app/log-in/log-in-form";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

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
    fetchMock.mockReset();
    turnstileResetMock.mockReset();
    notifySessionChangedMock.mockReset();
    vi.unstubAllGlobals();
  });

  function stubFetch() {
    vi.stubGlobal("fetch", fetchMock);
  }

  it("redirects to the given path on a password-only login", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(200, { mfaRequired: false }));
    render(<LogInForm redirectPath="/log" formTimingToken="test-token" />);

    fillAndSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/log"));
    expect(refreshMock).toHaveBeenCalled();
    expect(notifySessionChangedMock).toHaveBeenCalled();
  });

  it("posts email/password/captchaToken/formTimingToken to /api/auth/login-step1", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(200, { mfaRequired: false }));
    render(<LogInForm redirectPath="/projects" formTimingToken="test-token" />);

    fillAndSubmit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/auth/login-step1");
    expect(JSON.parse(options.body)).toEqual({
      email: "ada@example.com",
      password: "correct-horse-battery",
      captchaToken: "test-captcha-token",
      formTimingToken: "test-token",
    });
  });

  it("renders the MFA challenge form when mfaRequired is true", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        mfaRequired: true,
        pendingToken: "pending-123",
        nextFactorNeeded: "totp",
      }),
    );
    render(<LogInForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    expect(
      await screen.findByLabelText(/enter the 6-digit code from your authenticator app/i),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    // No session has actually been released to the client yet - the
    // matrix isn't satisfied until MfaChallengeForm's own submission
    // succeeds, so notifying here would be premature.
    expect(notifySessionChangedMock).not.toHaveBeenCalled();
  });

  it("shows a single generic message on invalid credentials", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Invalid email or password." }));
    render(<LogInForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic error when the request throws", async () => {
    stubFetch();
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<LogInForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });

  // ADR-0014: see sign-up-form.test.tsx's identical comment.
  it("resets the Turnstile widget when the server rejects the log-in", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Invalid email or password." }));
    render(<LogInForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    await waitFor(() => expect(turnstileResetMock).toHaveBeenCalled());
  });

  it("resets the Turnstile widget when the request throws", async () => {
    stubFetch();
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<LogInForm redirectPath="/" formTimingToken="test-token" />);

    fillAndSubmit();

    await waitFor(() => expect(turnstileResetMock).toHaveBeenCalled());
  });
});
