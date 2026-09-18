import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { pushMock, refreshMock, fetchMock, notifySessionChangedMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  fetchMock: vi.fn(),
  notifySessionChangedMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

// two-factor/verify releases the withheld session outside authClient's
// own dispatch (auth-client.ts's own comment) - see log-in-form.test.tsx's
// identical rationale.
vi.mock("@/features/auth/auth-client", () => ({
  notifySessionChanged: notifySessionChangedMock,
}));

import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("MfaChallengeForm", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
    refreshMock.mockReset();
    fetchMock.mockReset();
    notifySessionChangedMock.mockReset();
    vi.unstubAllGlobals();
  });

  function stubFetch() {
    vi.stubGlobal("fetch", fetchMock);
  }

  it("submits the entered code and redirects once verified", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(200, { verified: true }));
    render(
      <MfaChallengeForm
        redirectPath="/log"
        initialPendingToken="pending-1"
        initialFactorNeeded="totp"
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/log"));
    expect(refreshMock).toHaveBeenCalled();
    expect(notifySessionChangedMock).toHaveBeenCalled();

    const [, options] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(options.body)).toEqual({
      pendingToken: "pending-1",
      code: "123456",
      factorType: "totp",
      trustDevice: false,
    });
  });

  it("strips spaces from a numeric code before submitting (accessible-formatted copy/paste)", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(200, { verified: true }));
    render(
      <MfaChallengeForm
        redirectPath="/"
        initialPendingToken="pending-1"
        initialFactorNeeded="email"
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "1 2 3 4 5 6" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, options] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(options.body).code).toBe("123456");
  });

  it("chains to the next factor on a 202 without navigating away", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse(202, {
        verified: false,
        nextFactorNeeded: "email",
        pendingToken: "pending-2",
      }),
    );
    render(
      <MfaChallengeForm
        redirectPath="/"
        initialPendingToken="pending-1"
        initialFactorNeeded="totp"
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    expect(
      await screen.findByLabelText(/enter the 6-digit code we emailed you/i),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    // The matrix isn't satisfied yet - notifying here would make the
    // header briefly show a logged-in state before the remaining
    // factor is actually verified.
    expect(notifySessionChangedMock).not.toHaveBeenCalled();
  });

  it("shows an expiry message on 410 Gone", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(410, { error: "expired" }));
    render(
      <MfaChallengeForm
        redirectPath="/"
        initialPendingToken="pending-1"
        initialFactorNeeded="totp"
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This verification session has expired. Please log in again.",
    );
  });

  it("shows the server's error message on an invalid code", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "Invalid or expired code." }));
    render(
      <MfaChallengeForm
        redirectPath="/"
        initialPendingToken="pending-1"
        initialFactorNeeded="totp"
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid or expired code.");
  });

  it("submits trustDevice: true when the checkbox is checked", async () => {
    stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(200, { verified: true }));
    render(
      <MfaChallengeForm
        redirectPath="/"
        initialPendingToken="pending-1"
        initialFactorNeeded="totp"
      />,
    );

    fireEvent.click(screen.getByLabelText(/trust this device for 30 days/i));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).trustDevice).toBe(true);
  });
});
