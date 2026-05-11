const COLOR_PREFIXES = [
  "bg",
  "text",
  "border",
  "ring",
  "outline",
  "fill",
  "stroke",
  "divide",
  "decoration",
  "placeholder",
  "caret",
  "accent",
  "from",
  "to",
  "via",
];

const COLOR_VALUE = String.raw`#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|oklab\(|color\(`;

const ARBITRARY_RE = new RegExp(
  String.raw`(?:^|\s)(${COLOR_PREFIXES.join("|")})-\[(?:${COLOR_VALUE})[^\]]*\]`,
  "g",
);

const checkString = (value, node, context) => {
  if (typeof value !== "string") return;
  ARBITRARY_RE.lastIndex = 0;
  let match;
  while ((match = ARBITRARY_RE.exec(value)) !== null) {
    context.report({
      node,
      messageId: "noArbitrary",
      data: { match: match[0].trim() },
    });
  }
};

/** @type {import("eslint").Rule.RuleModule} */
const noArbitraryColor = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Tailwind arbitrary color values for color utilities (bg, text, border, ring, outline, fill, stroke, etc.). Define color tokens in the theme and use the generated utility. Shadow utilities are intentionally excluded — raw shadow values are allowed for now.",
    },
    messages: {
      noArbitrary:
        "`{{match}}` uses an arbitrary color value. Define a Tailwind color token in `app.css` `@theme` and use the generated utility instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (!node.name || node.name.name !== "className") return;
        const value = node.value;
        if (!value) return;

        if (value.type === "Literal") {
          checkString(value.value, value, context);
          return;
        }

        if (value.type === "JSXExpressionContainer") {
          const expr = value.expression;
          if (expr.type === "Literal") {
            checkString(expr.value, expr, context);
          } else if (expr.type === "TemplateLiteral") {
            for (const quasi of expr.quasis) {
              checkString(quasi.value.raw, quasi, context);
            }
          }
        }
      },
    };
  },
};

export default noArbitraryColor;
