import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes every top-level route exactly once", () => {
    const entries = sitemap();
    const paths = entries.map((entry) => entry.url);

    expect(paths).toEqual([
      "https://devafusion.net",
      "https://devafusion.net/about",
      "https://devafusion.net/projects",
      "https://devafusion.net/experiments",
      "https://devafusion.net/contact",
      "https://devafusion.net/legal",
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
