import fs from "node:fs";
import path from "node:path";

/**
 * Deep feature import rule.
 *
 * A "feature folder" is any directory directly inside a `-components/`,
 * `-hooks/`, `-lib/`, `-types/`, `-utils/` private segment that exposes an
 * `index.ts` / `index.tsx`. From OUTSIDE that folder, you must import its
 * public surface — the index — not internal files.
 *
 * Allowed:  `import { Foo } from "../-components/foo"`           (resolves to index)
 *           `import { internal } from "./internal"`              (sibling inside same folder)
 *
 * Forbidden:
 *           `import { internal } from "../-components/foo/internal"`
 *           `import { atom } from "../-components/foo/sub/atom"`
 */

const PRIVATE_SEGMENT_RE = /\/-(components|hooks|lib|types|utils)(\/|$)/;

const findFeatureFolder = (absPath) => {
  const parts = absPath.split(path.sep);
  for (let i = 0; i < parts.length - 1; i++) {
    if (/^-(components|hooks|lib|types|utils)$/.test(parts[i])) {
      const folder = parts.slice(0, i + 2).join(path.sep);
      const indexTs = path.join(folder, "index.ts");
      const indexTsx = path.join(folder, "index.tsx");
      if (fs.existsSync(indexTs) || fs.existsSync(indexTsx)) {
        return folder;
      }
    }
  }
  return null;
};

const isInside = (file, folder) =>
  file === folder || file.startsWith(`${folder}${path.sep}`);

/** @type {import("eslint").Rule.RuleModule} */
const noDeepFeatureImport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow deep imports into a feature folder that exposes a public `index`. Import the folder itself (resolves to index) instead of reaching into its internals.",
    },
    messages: {
      deepImport:
        "Deep feature import: `{{importPath}}` reaches into `{{feature}}` internals. Import the folder itself (`{{publicPath}}`) — its `index` is the public surface.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;

    const checkSource = (sourceNode) => {
      const importPath = sourceNode.value;
      if (typeof importPath !== "string") return;
      if (!importPath.startsWith(".")) return;

      const resolved = path.resolve(path.dirname(filename), importPath);
      if (!PRIVATE_SEGMENT_RE.test(`/${resolved}`)) return;

      const featureFolder = findFeatureFolder(resolved);
      if (!featureFolder) return;

      if (isInside(filename, featureFolder)) return;
      if (resolved === featureFolder) return;

      const relFeature = featureFolder.replace(/^.*\/src\//, "");
      const importPathParts = importPath.split("/");
      const featureName = path.basename(featureFolder);
      const featureIdx = importPathParts.lastIndexOf(featureName);
      const publicPath =
        featureIdx >= 0
          ? importPathParts.slice(0, featureIdx + 1).join("/")
          : importPath;

      context.report({
        node: sourceNode,
        messageId: "deepImport",
        data: {
          importPath,
          feature: relFeature,
          publicPath,
        },
      });
    };

    return {
      ImportDeclaration(node) {
        checkSource(node.source);
      },
      ExportAllDeclaration(node) {
        if (node.source) checkSource(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkSource(node.source);
      },
    };
  },
};

export default noDeepFeatureImport;
