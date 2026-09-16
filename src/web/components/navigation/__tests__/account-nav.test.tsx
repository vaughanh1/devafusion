import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above top-level variable declarations,
// so the mock functions they reference must be created via vi.hoisted
// rather than a plain const.
const { pushMock, refreshMock, signOutMock, useSessionMock, usePathnameMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    signOutMock: vi.fn(),
    useSessionMock: vi.fn(),
    usePathnameMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: usePathnameMock,
}));

vi.mock("@/features/auth/auth-client", () => ({
  authClient: {
    useSession: useSessionMock,
    signOut: signOutMock,
  },
}));

import { AccountNav } from "@/components/navigation/account-nav";

describe("AccountNav", () => {
  afterEach(() => {
    cleanup();
    pushMock.mockReset();
    refreshMock.mockReset();
    signOutMock.mockReset();
    useSessionMock.mockReset();
    usePathnameMock.mockReset();
  });

  it("renders nothing interactive while the session is pending", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    usePathnameMock.mockReturnValue("/log");
    render(<AccountNav />);

    expect(
      screen.queryByRole("link", { name: /log in/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /log out/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a log-in link with the current path as the redirect target", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    usePathnameMock.mockReturnValue("/log");
    render(<AccountNav />);

    const link = screen.getByRole("link", { name: /log in/i });
    expect(link).toHaveAttribute(
      "href",
      "/log-in?redirect=%2Flog",
    );
  });

  it("omits the redirect param when the current path is the home page", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    usePathnameMock.mockReturnValue("/");
    render(<AccountNav />);

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/log-in",
    );
  });

  it("shows an account link and log-out button when a session exists, which signs out and redirects home", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    });
    usePathnameMock.mockReturnValue("/log");
    signOutMock.mockResolvedValue(undefined);
    render(<AccountNav />);

    expect(screen.getByRole("link", { name: /account/i })).toHaveAttribute(
      "href",
      "/account",
    );

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(refreshMock).toHaveBeenCalled();
  });
});
