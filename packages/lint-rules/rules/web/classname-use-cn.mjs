/** @type {import("eslint").Rule.RuleModule} */
const classNameUseCn = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow template-literal/string-concat composition inside `className`. Use the `cn()` helper for conditional or composed classes so Tailwind conflicts get resolved and the pattern stays consistent.',
    },
    messages: {
      noTemplate:
        "Don't compose `className` with a template literal. Use `cn(...)` from `~/lib/utils` — e.g. `cn('base', conditional && 'extra', className)`.",
      noConcat:
        "Don't compose `className` with string concatenation. Use `cn(...)` from `~/lib/utils`.",
      noTernary:
        "Don't compose `className` with a top-level ternary. Use `cn('base', cond && 'a', !cond && 'b')` from `~/lib/utils`.",
      noLogical:
        "Don't compose `className` with a top-level `&&`/`||`. Pass it into `cn(...)` from `~/lib/utils`.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'className') return;
        const value = node.value;
        if (!value || value.type !== 'JSXExpressionContainer') return;

        const expr = value.expression;

        if (expr.type === 'TemplateLiteral' && expr.expressions.length > 0) {
          context.report({ node: expr, messageId: 'noTemplate' });
          return;
        }

        if (expr.type === 'BinaryExpression' && expr.operator === '+') {
          context.report({ node: expr, messageId: 'noConcat' });
          return;
        }

        if (expr.type === 'ConditionalExpression') {
          context.report({ node: expr, messageId: 'noTernary' });
          return;
        }

        if (
          expr.type === 'LogicalExpression' &&
          (expr.operator === '&&' || expr.operator === '||')
        ) {
          context.report({ node: expr, messageId: 'noLogical' });
        }
      },
    };
  },
};

export default classNameUseCn;
