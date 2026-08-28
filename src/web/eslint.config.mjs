import { defineConfig, globalIgnores } from "eslint/config";
import checkFile from "eslint-plugin-check-file";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
          "app/**/": "NEXT_JS_APP_ROUTER_CASE",
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
