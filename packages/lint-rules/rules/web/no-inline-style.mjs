const LITERAL_TYPES = new Set(["Literal", "TemplateLiteral"]);

const isStaticValue = (node) => {
  if (!node) return true;
  if (LITERAL_TYPES.has(node.type)) {
    if (node.type === "TemplateLiteral") {
      return node.expressions.length === 0;
    }
    return true;
  }
  if (node.type === "UnaryExpression" && LITERAL_TYPES.has(node.argument?.type)) {
    return true;
  }
  return false;
};

const isStaticObjectExpression = (node) => {
  if (node.type !== "ObjectExpression") return false;
  for (const prop of node.properties) {
    if (prop.type === "SpreadElement") return false;
    if (prop.type !== "Property") return false;
    if (prop.computed) return false;
    if (!isStaticValue(prop.value)) return false;
  }
  return true;
};

/** @type {import("eslint").Rule.RuleModule} */
const noInlineStyle = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline `style={}` JSX attribute when every value is a static literal — those should be Tailwind classes. Dynamic values (identifiers, member expressions, spreads, computed values) are allowed because they have no class equivalent.",
    },
    messages: {
      noStaticStyle:
        "Don't use inline `style` for static literal values. Use Tailwind classes via `className` (compose with `cn(...)` from `~/lib/utils` for conditionals). Inline `style` is only for genuinely dynamic values.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (!node.name || node.name.name !== "style") return;
        const value = node.value;
        if (!value || value.type !== "JSXExpressionContainer") return;
        const expr = value.expression;
        if (expr.type !== "ObjectExpression") return;
        if (!isStaticObjectExpression(expr)) return;
        context.report({ node, messageId: "noStaticStyle" });
      },
    };
  },
};

export default noInlineStyle;
