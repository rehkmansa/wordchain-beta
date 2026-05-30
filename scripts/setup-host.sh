#!/usr/bin/env bash
# One-time host bootstrap for wordchain on the shared VPS. Idempotent.
# Run once from the clone at /srv/wordchain/repo. See docs/OPERATIONS.md.
set -euo pipefail

ROOT=/srv/wordchain
REPO="$ROOT/repo"
SHARED="$ROOT/shared"
DB="$SHARED/data/wordchain.db"

mkdir -p "$SHARED/data"

# 1. shared/.env — prod config/secrets (chmod 600, never in git).
if [ ! -f "$SHARED/.env" ]; then
  cat > "$SHARED/.env" <<ENV
NODE_ENV=production
PORT=4700
BASE_URL=https://wordchain.codeposer.dev
AUTH_SECRET=CHANGE_ME_run_openssl_rand_base64_32
DB_PATH=$DB
ENV
  chmod 600 "$SHARED/.env"
  echo "▸ wrote $SHARED/.env — set AUTH_SECRET, then re-run this script"
fi

# 2. repo/.env -> shared/.env so Bun (cwd = repo) auto-loads prod config.
ln -sfn "$SHARED/.env" "$REPO/.env"

# 3. deps + corpus seed (idempotent — no duplicate inserts).
cd "$REPO"
bun install --frozen-lockfile
( cd "$REPO/apps/backend" && DB_PATH="$DB" bun run scripts/corpus-import.ts )

echo "✓ bootstrap done."
echo "  next: add the Caddy block (docs/OPERATIONS.md §Caddy), then run scripts/deploy.sh"
