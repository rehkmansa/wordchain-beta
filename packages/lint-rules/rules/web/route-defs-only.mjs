/**
 * Route files in `apps/web/src/routes/**` must contain only the route
 * definition (`createFileRoute(...)`, loaders, guards, etc.) — no JSX.
 * Components belong in a sibling `-components/` folder.
 *
 * What this rule enforces:
 *   - No JSX literals (`<Foo />`, `<>...</>`) anywhere in a route file.
 *   - Loaders / `beforeLoad` / `validateSearch` as inline arrows are fine —
 *     they don't return JSX.
 *
 * Excluded files (still allowed to contain JSX):
 *   - any file inside a `-components/` directory
 *   - any file inside any `-<group>/` private directory (`-hooks`, `-lib`, etc.)
 *   - `__root.tsx` (root layout, JSX is the whole point)
 *   - `routeTree.gen.ts` (generated)
 *   - Layout files matching `_<name>.tsx` at any level (e.g. `_splash.tsx`)
 */

const ROUTES_RE = /\/apps\/web\/src\/routes\//;
const PRIVATE_SEGMENT_RE = /\/-[^/]+(\/|$)/;
const LAYOUT_FILE_RE = /\/_[a-z][a-z0-9-]*\.tsx$/;

const isRouteFile = (filename) => {
  if (!ROUTES_RE.test(filename)) return false;
  if (PRIVATE_SEGMENT_RE.test(filename)) return false;
  if (filename.endsWith("__root.tsx")) return false;
  if (filename.endsWith("routeTree.gen.ts")) return false;
  if (LAYOUT_FILE_RE.test(filename)) return false;
  return true;
};

/** @type {import("eslint").Rule.RuleModule} */
const routeDefsOnly = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Route files must contain only route definitions. Move components (JSX) into a sibling `-components/` folder.",
    },
    messages: {
      noJsx:
        "Route files must not contain JSX. Move the page component into a sibling `-page.tsx` (and helpers into `-components/`), then import it here.",
    },
    schema: [],
  },
  create(context) {
    if (!isRouteFile(context.filename)) return {};

    const report = (node) => {
      context.report({ node, messageId: "noJsx" });
    };

    return {
      JSXElement: report,
      JSXFragment: report,
    };
  },
};

export default routeDefsOnly;
