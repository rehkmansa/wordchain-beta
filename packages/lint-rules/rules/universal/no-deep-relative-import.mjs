/**
 * Disallow deep relative imports (`../../...`).
 *
 * `./foo` and `../foo` are fine — they're local moves. Two or more `../`
 * segments mean you're reaching out of your folder, which is a smell:
 *  - Either the target should be promoted (pushed up the export tree) so
 *    callers don't need to know its internal path, or
 *  - A path alias should be used (e.g. `@web/...`, `@/...`).
 *
 * Configurable via `{ maxDepth: number }`. Default `maxDepth: 1` means at
 * most one `../` segment is allowed.
 */

/** @type {import("eslint").Rule.RuleModule} */
const noDeepRelativeImport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow relative imports with two or more `../` segments. Promote the export or use a path alias instead.",
    },
    messages: {
      deepRelative:
        "Deep relative import: `{{importPath}}` reaches up {{depth}} levels. Promote the target (push the export up) or use a path alias.",
    },
    schema: [
      {
        type: "object",
        properties: {
          maxDepth: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const maxDepth = typeof options.maxDepth === "number" ? options.maxDepth : 1;

    const checkSource = (sourceNode) => {
      const importPath = sourceNode.value;
      if (typeof importPath !== "string") return;
      if (!importPath.startsWith("../")) return;

      const segments = importPath.split("/");
      let depth = 0;
      for (const segment of segments) {
        if (segment === "..") depth += 1;
        else break;
      }

      if (depth <= maxDepth) return;

      context.report({
        node: sourceNode,
        messageId: "deepRelative",
        data: { importPath, depth: String(depth) },
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

export default noDeepRelativeImport;
