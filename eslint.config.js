import tsParser from "@typescript-eslint/parser";
import wordchain from "./packages/lint-rules/index.mjs";

const tsParserConfig = {
  parser: tsParser,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
};

export default [
  {
    ignores: ["**/routeTree.gen.ts", "**/node_modules/**", "**/dist/**"],
  },

  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: tsParserConfig,
    plugins: { wordchain },
    rules: {
      "wordchain/no-deep-relative-import": "error",
      "wordchain/no-deep-feature-import": "error",
      "wordchain/eslint-disable-needs-reason": "error",
    },
  },

  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: tsParserConfig,
    plugins: { wordchain },
    rules: {
      "max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
      "wordchain/tailwind-no-arbitrary-sizing-text": "error",
      "wordchain/tailwind-no-arbitrary-color": "error",
      "wordchain/no-cross-feature-import": "error",
      "wordchain/classname-use-cn": "error",
      "wordchain/no-inline-style": "error",
    },
  },

  {
    files: ["apps/backend/src/**/*.ts"],
    languageOptions: tsParserConfig,
    plugins: { wordchain },
    rules: {},
  },
];
