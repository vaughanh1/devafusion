import { describe, expect, it } from "vitest";

import { renderTotpQrCodeDataUri } from "../totp-qr-code";

// Proves the actual qrcode library behaviour this module depends on -
// a real PNG data URI, not a mocked assertion, mirroring this
// project's established "prove it against something real" posture
// (see totp-verification.test.ts's identical rationale for otpauth).
describe("renderTotpQrCodeDataUri", () => {
  it("renders a real PNG data URI, not the bare otpauth:// string", async () => {
    const dataUri = await renderTotpQrCodeDataUri(
      "otpauth://totp/DevAFusion:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DevAFusion",
    );

    expect(dataUri.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUri).not.toContain("otpauth://");
  });

  it("produces a non-trivial amount of image data", async () => {
    const dataUri = await renderTotpQrCodeDataUri(
      "otpauth://totp/DevAFusion:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DevAFusion",
    );
    const base64Payload = dataUri.split(",")[1]!;

    // A trivially small payload would indicate an empty/broken image
    // rather than an actual rendered QR code.
    expect(base64Payload.length).toBeGreaterThan(200);
  });
});
