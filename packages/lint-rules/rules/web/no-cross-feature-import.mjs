import path from "node:path";

/**
 * Cross-feature import rule.
 *
 * A "feature" is the route folder that owns a `-components/` (or `-hooks/`,
 * `-lib/`, `-types/`) directory. Files inside a feature's private folder may
 * only be imported by code that lives inside the same feature root.
 *
 * Allowed importers of `routes/A/-components/...`:
 *   - any file inside `routes/A/**`
 *
 * Forbidden:
 *   - importing `routes/A/-components/...` from `routes/B/**`
 *   - importing `routes/A/-components/...` from any `apps/web/src/<other-tree>/**`
 *
 * Shared code that needs to be reused across features must live outside
 * `routes/`, in e.g. `apps/web/src/ui/`, `apps/web/src/lib/`, `apps/web/src/hooks/`.
 */

const PRIVATE_SEGMENT_RE = /\/-(components|hooks|lib|types|utils|assets)(\/|$)/;

const featureRootOf = (absPath) => {
  const match = absPath.match(/^(.*\/routes\/.+?)\/-(?:components|hooks|lib|types|utils|assets)(?:\/|$)/);
  return match ? match[1] : null;
};

/** @type {import("eslint").Rule.RuleModule} */
const noCrossFeatureImport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing a route feature's private internals (`-components/`, `-hooks/`, etc.) from outside that feature's route folder. Shared code must live outside `routes/` (e.g. `apps/web/src/ui/`).",
    },
    messages: {
      crossFeature:
        "Cross-feature import: `{{importPath}}` reaches into feature `{{feature}}` from `{{importer}}`. Move shared code outside `routes/` (e.g. `apps/web/src/ui/`).",
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

      const importedFeature = featureRootOf(resolved);
      if (!importedFeature) return;

      const importerFeature = featureRootOf(filename);
      const importerInsideFeature =
        filename.startsWith(`${importedFeature}/`) ||
        filename === importedFeature ||
        filename === `${importedFeature}.tsx` ||
        filename === `${importedFeature}.ts`;

      if (importerInsideFeature) return;
      if (importerFeature === importedFeature) return;

      const relFeature = importedFeature.replace(/^.*\/routes\//, "routes/");
      const relImporter = filename.replace(/^.*\/apps\/web\/src\//, "");

      context.report({
        node: sourceNode,
        messageId: "crossFeature",
        data: {
          importPath,
          feature: relFeature,
          importer: relImporter,
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

export default noCrossFeatureImport;
