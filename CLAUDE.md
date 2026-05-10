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

## Doc Maintenance

Docs go stale. Prevent it:

- **When you change behavior that a doc describes, update that doc in the same commit.** Code and docs ship together — not separately.
- If you notice a doc contradicts the code, fix the doc immediately. The code is the source of truth.
- When adding a new feature or component, check if it needs a doc update.
- Never add a new doc without adding it to the scoped loading table above and to [README.md](README.md).

## Current Phase

Only build features listed in [docs/SCOPE.md](docs/SCOPE.md) under the current phase. If it says "Out of Scope" — don't build it.
