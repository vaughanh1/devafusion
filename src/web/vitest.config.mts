import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Coverage thresholds are intentionally unset (no arbitrary 100% vanity
// gate) — coverage is reported for transparency, not enforced as a hard
// build-breaking number, per src/web/__tests__/AGENTS.md.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "app/**/__tests__/**/*.test.{ts,tsx}",
      "components/**/__tests__/**/*.test.{ts,tsx}",
      "features/**/__tests__/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", ".next", "tests-e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "junit"],
      reportsDirectory: "./coverage",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "features/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/__tests__/**",
        "**/*.d.ts",
        "app/**/layout.tsx",
        "app/**/page.tsx",
      ],
    },
  },
});
