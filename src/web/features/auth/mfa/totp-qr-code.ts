import "server-only";

import QRCode from "qrcode";

// Renders the otpauth:// enrolment URI as a real PNG data URI, not a
// bare URI string - email clients (Gmail, Outlook) strip
// <img src="otpauth://..."> and most browsers/authenticator apps
// have no way to render a raw otpauth:// URI as anything scannable
// either. A PNG data URI works everywhere a normal <img> works,
// including inside an <img alt="..."> tag with real accessible
// alternative text (mfa-settings-dashboard.tsx supplies that text;
// this module has no opinion on markup, only image bytes).
//
// Error correction level "M" (Medium, ~15% recovery) - otpauth's own
// URIs are short (well under QR's practical byte ceiling even at
// higher correction levels), and M is otpauth/Google Authenticator's
// own commonly documented choice, balancing scan reliability against
// visual density.
export async function renderTotpQrCodeDataUri(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
  });
}
