# Operations — deploy & run

> WordChain runs on a **shared VPS** (`37.60.238.56`, `wordchain.codeposer.dev`)
> alongside other sites behind one Caddy. **Prime directive: don't break the
> neighbours** — append one Caddy block, take one port, touch nothing else.

## What runs

- **Backend** — one Bun process (`apps/backend/src/index.ts`, Hono + `bun:sqlite`)
  under **PM2** (`wordchain-backend`), bound to `127.0.0.1:4700` (loopback only).
- **Frontend** — a static `vite build` (`apps/web/dist`) served **by Caddy**. Not
  a process.
- **Caddy** (already on the host as a systemd service) terminates TLS, serves the
  static FE at `/`, and proxies `/api/*` (incl. the `/api/ws` WebSocket) to the
  backend. Same-origin ⇒ no CORS, cookie auth "just works".

```
browser ──HTTPS──▶ wordchain.codeposer.dev (Caddy, TLS)
                     /        → /srv/wordchain/repo/apps/web/dist  (static SPA)
                     /api/*   → 127.0.0.1:4700                     (backend + WS)
```

## How deployment works (continuous)

Push to `main` → **GitHub Actions** runs CI (`ci.yml`: typecheck, biome, eslint,
knip, build). If green, `deploy.yml` SSHes to the VPS and runs
[`scripts/deploy.sh`](../scripts/deploy.sh), which: `git reset --hard origin/main`
→ `bun install` → `build:web` → `pm2 startOrReload`. **No manual step.** The
backend self-migrates its SQLite schema on boot; the DB lives in `shared/` and
survives every deploy.

### CI/CD setup — SSH key + GitHub secrets (one-time)

GitHub Actions logs into the VPS with a **dedicated deploy keypair**: the public
half goes in the VPS `authorized_keys`, the private half becomes the `SSH_KEY`
secret. Do this once, from your laptop.

**1. Generate a keypair** (no passphrase — CI can't type one):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/wordchain_deploy -C "wordchain-ci" -N ""
#   ~/.ssh/wordchain_deploy       <- PRIVATE  (becomes the SSH_KEY secret)
#   ~/.ssh/wordchain_deploy.pub   <- PUBLIC   (goes on the VPS)
```

**2. Authorize the public key on the VPS** (needs an existing way in — your
current key or password):

```bash
ssh-copy-id -i ~/.ssh/wordchain_deploy.pub root@37.60.238.56
# manual equivalent:
cat ~/.ssh/wordchain_deploy.pub | ssh root@37.60.238.56 \
  'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

**3. Test the key works without a password:**

```bash
ssh -i ~/.ssh/wordchain_deploy root@37.60.238.56 "echo ok && bun --version && pm2 -v"
```

**4. Add the three repo secrets** (GitHub → repo → Settings → Secrets and
variables → Actions → New repository secret):

| Secret | Value |
|---|---|
| `SSH_HOST` | `37.60.238.56` |
| `SSH_USER` | `root` |
| `SSH_KEY` | the **entire** private key — `cat ~/.ssh/wordchain_deploy` (include the `BEGIN`/`END` lines) |

Or with the `gh` CLI (if installed + authenticated):

```bash
gh secret set SSH_HOST -b "37.60.238.56"            -R rehkmansa/wordchain-beta
gh secret set SSH_USER -b "root"                    -R rehkmansa/wordchain-beta
gh secret set SSH_KEY  < ~/.ssh/wordchain_deploy    -R rehkmansa/wordchain-beta
```

> The private key never goes in git — only on your laptop and in the GitHub
> secret. Root is the host's current run-context; a dedicated `wordchain` deploy
> user is a later hardening.

## On-disk layout (VPS)

```
/srv/wordchain/
  repo/                      # persistent clone; deploy.sh resets it to origin/main
    apps/web/dist/           # built FE Caddy serves (rebuilt in place each deploy)
    .env -> ../shared/.env   # symlink so Bun (cwd=repo) loads prod config
  shared/
    .env                     # prod secrets (chmod 600, NOT in git)
    data/wordchain.db        # SQLite system of record — survives deploys
```

`shared/.env`:

```
NODE_ENV=production
PORT=4700
BASE_URL=https://wordchain.codeposer.dev
AUTH_SECRET=<openssl rand -base64 32>
DB_PATH=/srv/wordchain/shared/data/wordchain.db
```

## First-time host bootstrap (once)

```bash
sudo mkdir -p /srv/wordchain && sudo chown "$USER" /srv/wordchain
git clone https://github.com/rehkmansa/wordchain-beta.git /srv/wordchain/repo
/srv/wordchain/repo/scripts/setup-host.sh     # writes shared/.env template + symlink
#   → set AUTH_SECRET in /srv/wordchain/shared/.env
/srv/wordchain/repo/scripts/setup-host.sh     # re-run: installs + seeds corpus
# add the Caddy block (below), reload Caddy
/srv/wordchain/repo/scripts/deploy.sh         # first build + PM2 start
pm2 save && pm2 startup                        # persist across reboots
```

Prereqs: DNS `wordchain.codeposer.dev` A → the VPS (already set); Bun + PM2 +
Caddy already present. The old `wordchain.codeposer.dev` mapping (Docker on
`:4500`/`:8420`) is replaced by this — stop those containers once the new site is
verified (`docker ps` → `docker stop <id>`); `:4700` is fresh so there's no clash
during cutover.

### Caddy

Replace the existing `wordchain.codeposer.dev` block in `/etc/caddy/Caddyfile`
with:

```
wordchain.codeposer.dev {
    encode gzip
    handle /api/* {
        reverse_proxy 127.0.0.1:4700   # WS upgrade for /api/ws is automatic
    }
    handle {
        root * /srv/wordchain/repo/apps/web/dist
        try_files {path} /index.html   # SPA fallback (TanStack Router)
    }
}
```

`caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`
(a bad directive refuses **all** sites on reload — validate first).

## Verify a deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://wordchain.codeposer.dev/api/rooms/ZZZZZZ  # 404 (API live)
curl -s -X POST https://wordchain.codeposer.dev/api/auth/anon | head -c 80                 # anon user JSON
readlink /srv/wordchain/repo/.env     # -> /srv/wordchain/shared/.env
pm2 ls | grep wordchain-backend       # online
# corpus seeded (games can't start without pairs):
#   the backend logs the pair count on boot, or check via the app
```

## Rollback

```bash
cd /srv/wordchain/repo
git reset --hard <previous-sha>
bun install --frozen-lockfile && bun run build:web
pm2 reload ecosystem.config.cjs --update-env
```

## Things that will bite you

- **Empty corpus ⇒ games never start.** A fresh DB has no word pairs;
  `setup-host.sh` runs `corpus:import` (idempotent). After a DB reset, re-run it.
- **`AUTH_SECRET` is required in prod.** Unset ⇒ the backend throws on boot
  (`env.ts`). Cookies are `Secure` (HTTPS-only) because `NODE_ENV=production`.
- **`:4700` stays loopback.** Only Caddy reaches it; never `ufw allow 4700`.
- **`.env` is a symlink, gitignored.** `git reset --hard` won't remove it (it's
  untracked). If it goes missing, re-run `setup-host.sh`.
