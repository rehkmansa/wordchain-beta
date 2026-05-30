#!/usr/bin/env bash
# Continuous-deploy step — run ON the VPS by .github/workflows/deploy.yml over
# SSH, only after CI is green. Pulls the green SHA, rebuilds the static FE, and
# reloads the backend. Idempotent; safe to re-run. See docs/OPERATIONS.md.
set -euo pipefail

REPO=/srv/wordchain/repo
cd "$REPO"

echo "▸ fetch origin/main"
git fetch --quiet origin main
git reset --hard --quiet origin/main

echo "▸ install deps"
bun install --frozen-lockfile

echo "▸ build web (static dist Caddy serves)"
bun run build:web

echo "▸ reload backend (PM2; the server self-migrates the DB on boot)"
pm2 startOrReload "$REPO/ecosystem.config.cjs" --update-env
pm2 save --force >/dev/null

echo "✓ deployed $(git rev-parse --short HEAD)"
