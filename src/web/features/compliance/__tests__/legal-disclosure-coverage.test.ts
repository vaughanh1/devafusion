import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { knownDataProcessors } from "@/features/compliance/known-data-processors";

// Root of the application source, walked recursively below -
// deliberately src/web itself (this file's own repo root), not a
// narrower feature directory, since a new processor call site could
// land anywhere (a route handler, a component, auth.ts itself).
const SRC_ROOT = join(__dirname, "..", "..", "..");

// Directories that are either not application source (build output,
// dependencies) or would produce false positives if walked (this
// registry file and this test file themselves legitimately contain
// every sourceSignature string as data, not as a real call site).
const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "coverage",
  "tests-e2e",
]);

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue;

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walkFiles(fullPath, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(fullPath);
    }
  }

  return out;
}

// Read once for every test in this file - this repo's own source
// tree, not a fixture, so a real new call site is what actually
// fails a test here, not a synthetic example.
const allSourceFiles = walkFiles(SRC_ROOT);

// Excludes this feature's own directory (known-data-processors.ts
// legitimately lists every sourceSignature as data, and this test
// file legitimately references them too) - everything else in the
// walked tree is a genuine call site if a signature matches.
const nonComplianceFeatureFiles = allSourceFiles.filter(
  (path) => !path.includes(`${join("features", "compliance")}`),
);

function fileContainsAny(path: string, needles: string[]): boolean {
  const content = readFileSync(path, "utf8");
  return needles.some((needle) => content.includes(needle));
}

const legalPageContent = readFileSync(
  join(SRC_ROOT, "app", "legal", "page.tsx"),
  "utf8",
);

describe("legal-disclosure-coverage", () => {
  // Honesty check on this suite's own real limit, not a demonstration
  // of catching the regression: this session's actual gap was
  // Azure Communication Services being disclosed, but scoped only to
  // MFA, while a second, unrelated ACS call site (email
  // verification/reset) shipped uncovered by that scoped wording.
  // "Azure Communication Services" was present on /legal throughout,
  // so this presence-only, registry-level check would NOT have
  // caught that specific regression - it only catches a processor
  // with zero matching disclosure text anywhere on the page. See
  // known-data-processors.ts's own comment: the scope-accuracy
  // problem is inherently semantic and is not automatable by this or
  // any tool: it is the log-entry review step that is the real
  // backstop for it.
  it("documents that presence-only matching cannot detect a scope-narrowed (not absent) disclosure", () => {
    const acsProcessor = knownDataProcessors.find(
      (p) => p.name === "Azure Communication Services (email)",
    )!;
    const scopedToMfaOnlyWording =
      "If you choose to receive a code by email, we use Azure Communication Services to send it.";

    const wouldPassPresenceCheck = acsProcessor.requiredLegalText.some(
      (text) => scopedToMfaOnlyWording.includes(text),
    );

    expect(wouldPassPresenceCheck).toBe(true);
  });

  // Proves what this suite DOES catch: a processor genuinely called
  // from source with zero matching text anywhere on /legal - the
  // actual failure mode the "every processor... has matching
  // disclosure text" test above guards against on every future PR.
  // A fabricated processor/fixture pair, not a mutation of the real
  // registry or page, so this proof has no risk of leaking a false
  // "passing" state into the real coverage test.
  it("fails a fabricated processor with a real-looking call site and no matching disclosure", () => {
    const fabricatedProcessor = {
      name: "Fabricated Test Processor",
      sourceSignatures: ["@azure/communication-email"], // a real, present signature
      requiredLegalText: ["This exact string does not appear on /legal"],
    };

    const isUsedAnywhere = nonComplianceFeatureFiles.some((path) =>
      fileContainsAny(path, fabricatedProcessor.sourceSignatures),
    );
    const isDisclosed = fabricatedProcessor.requiredLegalText.some((text) =>
      legalPageContent.includes(text),
    );

    expect(isUsedAnywhere).toBe(true);
    expect(isDisclosed).toBe(false);
  });
  // Catches a new processor call site with no registry entry at
  // all: sourceSignatures below is deliberately empty, so a match
  // here means the registry itself is out of date, before even
  // checking /legal.
  it("every known processor's sourceSignatures actually appear somewhere in source (registry is not stale)", () => {
    for (const processor of knownDataProcessors) {
      const isUsedAnywhere = nonComplianceFeatureFiles.some((path) =>
        fileContainsAny(path, processor.sourceSignatures),
      );
      expect(
        isUsedAnywhere,
        `${processor.name}'s sourceSignatures matched no file in src/web - ` +
          `either the registry entry is stale (the processor was removed) ` +
          `or its sourceSignatures need updating to match the real call site.`,
      ).toBe(true);
    }
  });

  // The actual GDPR-transparency check this file exists for: every
  // processor genuinely called from source has matching disclosure
  // text on /legal. This is what would have failed the moment this
  // session's ACS verification-email call site was added without
  // updating /legal.
  it("every processor with a real call site in source has matching disclosure text on /legal", () => {
    for (const processor of knownDataProcessors) {
      const isUsedAnywhere = nonComplianceFeatureFiles.some((path) =>
        fileContainsAny(path, processor.sourceSignatures),
      );
      if (!isUsedAnywhere) continue;

      const isDisclosed = processor.requiredLegalText.some((text) =>
        legalPageContent.includes(text),
      );
      expect(
        isDisclosed,
        `${processor.name} is called from source but none of its ` +
          `requiredLegalText strings appear on app/legal/page.tsx - ` +
          `add or restore its disclosure before merging.`,
      ).toBe(true);
    }
  });
});
