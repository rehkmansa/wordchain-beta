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
    rules: {},
  },

  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: tsParserConfig,
    plugins: { wordchain },
    rules: {
      "wordchain/tailwind-no-arbitrary-sizing-text": "error",
    },
  },

  {
    files: ["apps/backend/src/**/*.ts"],
    languageOptions: tsParserConfig,
    plugins: { wordchain },
    rules: {},
  },
];
