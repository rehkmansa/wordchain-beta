const BANNED_PREFIXES = [
  "h",
  "w",
  "max-h",
  "max-w",
  "min-h",
  "min-w",
  "size",
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "ps",
  "pe",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "ms",
  "me",
  "gap",
  "gap-x",
  "gap-y",
  "space-x",
  "space-y",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-x",
  "inset-y",
];

const ARBITRARY_RE = new RegExp(
  String.raw`(?:^|\s)(${BANNED_PREFIXES.join("|")})-\[[^\]]+\]`,
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
const noArbitrarySizingText = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Tailwind arbitrary values for sizing, spacing, and positioning utilities (they multiply the spacing scale — `w-10` rather than `w-[40px]`). Typography prefixes (text, leading, tracking, font) are NOT included — they have no spacing scale so arbitrary values are fine there.",
    },
    messages: {
      noArbitrary:
        "`{{match}}` uses an arbitrary Tailwind value for a spacing-scale utility. Use the scale (e.g. `h-10` for 40px) or a theme token.",
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

export default noArbitrarySizingText;
