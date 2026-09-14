import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { engineeringLog } from "@/features/log/engineering-log";
import { projects } from "@/features/projects/projects";

describe("sitemap", () => {
  it("includes every static top-level route exactly once", () => {
    const entries = sitemap();
    const paths = entries.map((entry) => entry.url);

    expect(paths).toEqual(
      expect.arrayContaining([
        "https://devafusion.net",
        "https://devafusion.net/about",
        "https://devafusion.net/projects",
        "https://devafusion.net/experiments",
        "https://devafusion.net/contact",
        "https://devafusion.net/legal",
        "https://devafusion.net/log",
      ]),
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("includes every engineering log entry with its real date", () => {
    const entries = sitemap();
    const logEntry = engineeringLog[0];

    const matching = entries.find(
      (entry) => entry.url === `https://devafusion.net/log/${logEntry.slug}`,
    );

    expect(matching).toBeDefined();
    expect(matching?.lastModified).toEqual(new Date(logEntry.date));
  });

  it("includes every project detail route", () => {
    const entries = sitemap();
    const project = projects[0];

    const matching = entries.find(
      (entry) =>
        entry.url === `https://devafusion.net/projects/${project.slug}`,
    );

    expect(matching).toBeDefined();
  });

  it("stamps every entry with a lastModified Date instance", () => {
    const entries = sitemap();

    entries.forEach((entry) => {
      expect(entry.lastModified).toBeInstanceOf(Date);
    });
  });
});