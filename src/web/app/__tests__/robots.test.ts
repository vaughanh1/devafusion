import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots", () => {
  it("falls back to the production domain when NEXT_PUBLIC_SITE_URL is unset", () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const result = robots();

    expect(result.sitemap).toBe("https://devafusion.net/sitemap.xml");

    if (original !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    }
  });

  it("allows all crawlers at the root path", () => {
    const result = robots();

    expect(result.rules).toEqual({ userAgent: "*", allow: "/" });
  });
});
