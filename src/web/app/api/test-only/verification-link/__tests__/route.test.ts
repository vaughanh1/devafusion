import { afterEach, describe, expect, it, vi } from "vitest";

const { isTestVerificationCaptureEnabledMock, consumeTestVerificationLinkMock } =
  vi.hoisted(() => ({
    isTestVerificationCaptureEnabledMock: vi.fn(),
    consumeTestVerificationLinkMock: vi.fn(),
  }));

vi.mock("@/features/auth/test-verification-link-cache", () => ({
  isTestVerificationCaptureEnabled: isTestVerificationCaptureEnabledMock,
  consumeTestVerificationLink: consumeTestVerificationLinkMock,
}));

import { GET } from "@/app/api/test-only/verification-link/route";

function buildRequest(query: string) {
  return new Request(
    `https://devafusion.net/api/test-only/verification-link${query}`,
  );
}

describe("GET /api/test-only/verification-link", () => {
  afterEach(() => {
    isTestVerificationCaptureEnabledMock.mockReset();
    consumeTestVerificationLinkMock.mockReset();
  });

  // Zero surface in a real deployment - confirmed here that a real
  // request (capture disabled) 404s before ever touching the cache.
  it("returns 404 when test verification capture is disabled", async () => {
    isTestVerificationCaptureEnabledMock.mockReturnValue(false);

    const response = await GET(buildRequest("?email=ada@example.com"));

    expect(response.status).toBe(404);
    expect(consumeTestVerificationLinkMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the email query parameter is missing", async () => {
    isTestVerificationCaptureEnabledMock.mockReturnValue(true);

    const response = await GET(buildRequest(""));

    expect(response.status).toBe(400);
  });

  it("returns 404 when no link was captured for that email", async () => {
    isTestVerificationCaptureEnabledMock.mockReturnValue(true);
    consumeTestVerificationLinkMock.mockReturnValue(undefined);

    const response = await GET(buildRequest("?email=ada@example.com"));

    expect(response.status).toBe(404);
  });

  it("returns the captured url when present", async () => {
    isTestVerificationCaptureEnabledMock.mockReturnValue(true);
    consumeTestVerificationLinkMock.mockReturnValue(
      "https://devafusion.net/api/auth/verify-email?token=abc",
    );

    const response = await GET(buildRequest("?email=ada@example.com"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe(
      "https://devafusion.net/api/auth/verify-email?token=abc",
    );
    expect(consumeTestVerificationLinkMock).toHaveBeenCalledWith(
      "ada@example.com",
    );
  });
});
