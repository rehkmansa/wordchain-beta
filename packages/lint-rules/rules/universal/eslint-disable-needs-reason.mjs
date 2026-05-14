const DISABLE_RE = /^\s*eslint-disable(?:-next-line|-line)?\b([^]*)$/;

const hasReason = (rest) => {
  const idx = rest.indexOf("--");
  if (idx === -1) return false;
  const reason = rest.slice(idx + 2).trim();
  return reason.length > 0;
};

/** @type {import("eslint").Rule.RuleModule} */
const eslintDisableNeedsReason = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require an explanation after `--` on every `eslint-disable*` directive. Format: `// eslint-disable-next-line some-rule -- why this is needed`.",
    },
    messages: {
      missing:
        "`eslint-disable*` directive needs a reason. Append ` -- <reason>` explaining why the rule is suppressed here.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        for (const comment of sourceCode.getAllComments()) {
          const match = DISABLE_RE.exec(comment.value);
          if (!match) continue;
          if (hasReason(match[1] ?? "")) continue;
          context.report({ loc: comment.loc, messageId: "missing" });
        }
      },
    };
  },
};

export default eslintDisableNeedsReason;
