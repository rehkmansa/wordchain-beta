# project-name

> One-line description of the project.

## Scoped Doc Loading

Don't read everything — load docs based on what you're working on.

**Always read (all scopes):**
- [docs/PRODUCT.md](docs/PRODUCT.md) — what this is, why it exists
- [docs/SCOPE.md](docs/SCOPE.md) — what's in/out per version (respect boundaries)

**Frontend work** (`apps/web/`):
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, component responsibilities
- [docs/DECISIONS.md](docs/DECISIONS.md) — tech choices
- [docs/API.md](docs/API.md) — API contract (interface to the backend)
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md) — user flows the UI must support

**Backend work** (`apps/backend/`):
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data flow
- [docs/DECISIONS.md](docs/DECISIONS.md) — tech choices
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md) — SQLite schema
- [docs/API.md](docs/API.md) — API contract

**Security / config:**
- [docs/SECURITY.md](docs/SECURITY.md) — threat model, key storage

## Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict)
- **Database:** SQLite via `bun:sqlite`
- **Frontend:** React + Vite + Tailwind CSS + TanStack Router
- **Backend:** Hono
- **Monorepo:** Bun workspaces

## Project Structure

```
project-name/
├── apps/
│   ├── web/              — React frontend
│   └── backend/          — Hono API server (Bun)
├── packages/
│   └── shared/           — Shared types, constants
├── docs/                 — Product and architecture docs
├── CLAUDE.md             — This file
└── README.md
```

## Conventions

- TypeScript strict mode everywhere
- No `any` types — use `unknown` and narrow
- Prefer `const` over `let`
- Use Bun APIs where available (bun:sqlite, Bun.serve)
- Error handling: let it crash for unrecoverable errors, handle gracefully for user-facing ones
- No comments that describe what — only why
- Path alias `~/*` → `apps/web/src/*` for frontend imports (configured in tsconfig + vite)
- UI components default to plain files (`ui/button.tsx`). Use a folder only when files share a parent identity / are consumed exclusively by that group (e.g. `ui/start-screens/`). Avoid premature folder structure.
- Page routes are folder-mode with two siblings: `routes/<segment>/route.tsx` + `routes/<segment>/-page.tsx`. `route.tsx` handles URL/route concerns only (`createFileRoute(...)`, loaders, guards — no JSX) and stays lean. `-page.tsx` is the page component. Helpers used by the page live in `routes/<segment>/-components/` (created only when needed). TanStack ignores `-`-prefixed files/folders, so they're route-private. Layout files (`_<name>.tsx`) and `__root.tsx` remain flat. Enforced by `wordchain/page-route-folder-mode` + `wordchain/route-defs-only`.
- All component previews live in a single manually-curated file `apps/web/src/ui/_preview.tsx`, rendered at `/preview` (dev only). Underscore prefix marks it as a non-component dev artifact.

## Doc Maintenance

Docs go stale. Prevent it:

- **When you change behavior that a doc describes, update that doc in the same commit.** Code and docs ship together — not separately.
- If you notice a doc contradicts the code, fix the doc immediately. The code is the source of truth.
- When adding a new feature or component, check if it needs a doc update.
- Never add a new doc without adding it to the scoped loading table above and to [README.md](README.md).

## Current Phase

Only build features listed in [docs/SCOPE.md](docs/SCOPE.md) under the current phase. If it says "Out of Scope" — don't build it.
