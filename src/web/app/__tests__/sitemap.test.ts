import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes every top-level route exactly once", () => {
    const entries = sitemap();
    const paths = entries.map((entry) => entry.url);

    expect(paths).toEqual([
      "https://devafusion.com",
      "https://devafusion.com/about",
      "https://devafusion.com/projects",
      "https://devafusion.com/experiments",
      "https://devafusion.com/contact",
      "https://devafusion.com/legal",
    ]);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("stamps every entry with a lastModified Date instance", () => {
    const entries = sitemap();

    entries.forEach((entry) => {
      expect(entry.lastModified).toBeInstanceOf(Date);
    });
  });
});
