// PM2 process model for wordchain on the shared VPS.
//
// One backend process (Bun + Hono + bun:sqlite). The frontend is a static
// `vite build` served directly by Caddy — it is NOT a PM2 process.
//
// Config/secrets come from /srv/wordchain/shared/.env, symlinked to repo/.env
// so Bun auto-loads it (cwd = repo). See docs/OPERATIONS.md.
const repo = __dirname;

module.exports = {
  apps: [
    {
      name: "wordchain-backend",
      cwd: repo,
      script: "apps/backend/src/index.ts",
      interpreter: "bun",
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 5000,
    },
  ],
};
