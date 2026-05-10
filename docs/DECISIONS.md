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
| Biome | Fast linter + formatter, replaces ESLint + Prettier |
