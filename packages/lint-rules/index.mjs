/**
 * @wordchain/lint-rules
 *
 * Local ESLint plugin bundling project-specific rules.
 * Imported directly in the root `eslint.config.js` (not published to npm).
 *
 * Rule files live under `rules/<group>/<rule>.mjs`. To add a new rule:
 *   1. Drop a `{ meta, create }` module under the appropriate group folder.
 *   2. Import + register it in the `rules` map below.
 *   3. Wire its severity in the root `eslint.config.js`, under the
 *      config block whose `files:` glob matches where the rule should run.
 *
 * Groups:
 *   universal/ — language hygiene that applies to any TS/JS code (web + backend + packages)
 *   web/       — React, Tailwind, browser-only rules
 *   backend/   — Bun/Hono/server-only rules
 */

import noDeepRelativeImport from "./rules/universal/no-deep-relative-import.mjs";
import tailwindNoArbitraryColor from "./rules/web/tailwind-no-arbitrary-color.mjs";
import tailwindNoArbitrarySizingText from "./rules/web/tailwind-no-arbitrary-sizing-text.mjs";

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
  meta: {
    name: "wordchain",
    version: "0.0.0",
  },
  rules: {
    "no-deep-relative-import": noDeepRelativeImport,
    "tailwind-no-arbitrary-sizing-text": tailwindNoArbitrarySizingText,
    "tailwind-no-arbitrary-color": tailwindNoArbitraryColor,
  },
};

export default plugin;
