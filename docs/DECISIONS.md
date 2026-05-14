# Decisions

Technical decisions and their rationale. Update this when making significant tech choices.

## Stack Choices

| Choice | Why |
|--------|-----|
| Bun | Fast runtime, built-in SQLite, native TS |
| Hono | Lightweight, works with Bun, good DX |
| React + Vite | Fast dev server, standard ecosystem |
| Tailwind CSS | Utility-first, no CSS file sprawl |
| TanStack Router | Type-safe file-based routing |
| Bun workspaces | Native monorepo support, same runtime as backend |
| SQLite | Embedded, zero config, good enough for most apps |
| Biome | Fast linter + formatter (kebab-case filenames, format on commit) |
| ESLint (flat config) | Hosts custom project-specific rules that Biome can't express |
| Custom lint-rules package | `packages/lint-rules` ships project rules (Tailwind hygiene, feature-boundary enforcement) as a local plugin — grouped by `universal/`, `web/`, `backend/` |

## Frontend Conventions

### Feature scope = route folder

A "feature" is a route folder. Each route owns its private components, hooks, utilities, and types in sibling folders prefixed with `-`:

```
routes/<route>/
  -components/   ← private composites (PlayerList, JoinForm, ...)
  -hooks/        ← route-local hooks
  -lib/          ← route-local helpers
  -types/        ← route-local types
```

The `-` prefix is recognized by TanStack Router as a non-route folder, so it never affects the URL graph.

Why this shape:
- Code that exists for one route lives next to that route — easy to find, easy to delete with the route.
- Forces an explicit promotion step when something becomes reusable (move out of `-components/` into `apps/web/src/ui/`).

### Feature-boundary rules (lint-enforced)

| Rule | What it forbids |
|------|-----------------|
| `wordchain/no-cross-feature-import` | Importing another route's `-components/` (or `-hooks/`, etc.). If you want to share, promote the code outside `routes/`. |
| `wordchain/no-deep-feature-import` | Reaching into a component folder that exposes an `index`. Import the folder; its index is the public surface. |

Shared global code lives outside `routes/`:

```
apps/web/src/
  ui/      ← design-system primitives, used across features
  lib/     ← global helpers
  hooks/   ← global hooks
```

### Components

- Arrow function components only (`const Foo = () => { ... }`). Not enforced by lint yet; convention.
- Declare the component first, export `Route` after — avoids use-before-declare with arrow functions.

### Styling

- Tailwind v4 with theme tokens in `apps/web/src/app.css` `@theme` block.
- No arbitrary values for color, sizing, spacing, positioning, or text utilities — defined tokens or the spacing scale only. Enforced by:
  - `wordchain/tailwind-no-arbitrary-color`
  - `wordchain/tailwind-no-arbitrary-sizing-text`
- Shadow utilities (`shadow-[…]`, `drop-shadow-[…]`) are intentionally allowed raw for now.

### File size

- `max-lines: 600` for `apps/web/src/**/*.{ts,tsx}` (skipping blank lines and comments). Forces decomposition before files become unreadable.

### Filenames

- Kebab-case enforced by Biome (`useFilenamingConvention`). TanStack's special-syntax files (`__root.tsx`, `_<layout>.tsx`, `$<param>/`, `$<param>.tsx`) are exempted via Biome `overrides` since the framework requires those exact shapes.

## Tooling

| Tool | Role |
|------|------|
| Biome | Formatting, filename rules, recommended lint set |
| ESLint (flat config) | Project-specific rules from `packages/lint-rules` |
| Lefthook | Pre-commit pipeline (sequential): biome → eslint → knip. Skipped on merge/rebase. |
| Knip | Dead-code and unused-dependency detection |
