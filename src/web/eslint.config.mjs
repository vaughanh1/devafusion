import { defineConfig, globalIgnores } from "eslint/config";
import checkFile from "eslint-plugin-check-file";
import jsxA11y from "eslint-plugin-jsx-a11y";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next's core-web-vitals already registers the
    // "jsx-a11y" plugin (for its own narrow rule subset), so only the
    // rules are merged here — re-declaring `plugins` conflicts with that
    // existing registration. Enables the plugin's full recommended rule
    // set on top (src/web/AGENTS.md).
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "features/**/*.{ts,tsx}",
    ],
    plugins: {
      "check-file": checkFile,
    },
    rules: {
      "check-file/folder-naming-convention": [
        "error",
        {
          // Test-locality directories (src/web/__tests__/AGENTS.md) are
          // exempt from route-segment casing — they hold test files, not
          // route segments, and always use the literal "__tests__" name.
          "app/**/!(__tests__)/": "NEXT_JS_APP_ROUTER_CASE",
          "components/*/": "KEBAB_CASE",
          "features/*/": "KEBAB_CASE",
        },
      ],
      "check-file/filename-naming-convention": [
        "error",
        {
          "app/**/*.{ts,tsx}": "KEBAB_CASE",
          "components/**/*.{ts,tsx}": "KEBAB_CASE",
          "features/**/*.{ts,tsx}": "KEBAB_CASE",
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
