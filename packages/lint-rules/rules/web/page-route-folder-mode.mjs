import path from "node:path";

/**
 * Page routes must be folder-mode: `<route>/route.tsx` (with the page component
 * extracted to `<route>/-components/page.tsx`). Loose `.tsx` files under
 * `routes/` for page routes are forbidden.
 *
 * Allowed:
 *   - `routes/<...>/route.tsx`                  ← folder-mode page route
 *   - `routes/__root.tsx`                       ← root
 *   - `routes/_<name>.tsx`                      ← layout / pathless route
 *   - `routes/<...>/_<name>.tsx`                ← nested layout
 *   - `routes/<...>/-components/...`            ← private feature files
 *   - `routes/routeTree.gen.ts`                 ← generated
 *
 * Forbidden:
 *   - `routes/about.tsx`                        ← should be `routes/about/route.tsx`
 *   - `routes/_splash/index.tsx`                ← should be `routes/_splash/index/route.tsx`
 */

const ROUTES_RE = /\/apps\/web\/src\/routes\//;
const PRIVATE_SEGMENT_RE = /\/-[^/]+(\/|$)/;

const shouldCheck = (filename) => {
  if (!ROUTES_RE.test(filename)) return false;
  if (PRIVATE_SEGMENT_RE.test(filename)) return false;
  if (filename.endsWith("routeTree.gen.ts")) return false;
  if (!filename.endsWith(".tsx")) return false;

  const basename = path.basename(filename);

  if (basename === "__root.tsx") return false;
  if (basename === "route.tsx") return false;
  if (basename.startsWith("_")) return false;

  return true;
};

/** @type {import("eslint").Rule.RuleModule} */
const pageRouteFolderMode = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Page routes under `routes/` must be folder-mode (`<route>/route.tsx`), not flat `.tsx` files.",
    },
    messages: {
      flatRoute:
        "Page route `{{basename}}` must be folder-mode. Move it to `{{routeName}}/route.tsx` and extract its component into `{{routeName}}/-page.tsx`.",
    },
    schema: [],
  },
  create(context) {
    if (!shouldCheck(context.filename)) return {};

    return {
      Program(node) {
        const basename = path.basename(context.filename);
        const routeName = basename.replace(/\.tsx$/, "");
        context.report({
          node,
          messageId: "flatRoute",
          data: { basename, routeName },
        });
      },
    };
  },
};

export default pageRouteFolderMode;
