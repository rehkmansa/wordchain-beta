// PM2 process model for wordchain on the shared VPS.
//
// One backend process (Bun + Hono + bun:sqlite). The frontend is a static
// `vite build` served directly by Caddy — it is NOT a PM2 process.
//
// Config/secrets come from /srv/wordchain/shared/.env, symlinked to repo/.env
// so Bun auto-loads it (cwd = repo). See docs/OPERATIONS.md.
//
// We fork-exec bun directly (no `interpreter: "bun"`). PM2's bun interpreter
// routes through `ProcessContainerForkBun.js`, which `require()`s the entry —
// but Bun's "default export becomes Bun.serve config" auto-bootstrap only
// fires when the file is the bun entrypoint, not when it's required. Going
// through the wrapper silently exits without binding the port.
const repo = __dirname;

module.exports = {
  apps: [
    {
      name: "wordchain-backend",
      cwd: repo,
      script: "bun",
      args: "apps/backend/src/index.ts",
      interpreter: "none",
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 5000,
    },
  ],
};
