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

## Backend

### Hybrid state by temperature

Active rooms live in `Map<roomCode, Room>` in RAM. Durable state (users, corpus, finished-game history, per-round-end snapshots) lives in SQLite. The hot path is pure memory; SQLite is touched only at round boundaries.

**Why:** every player action triggers per-player broadcasts; in Group N=8 with simultaneous answers, write amplification to SQLite would be wasted IO for state that's already ephemeral. RAM keeps the round loop snappy; SQLite keeps anything that must survive a restart.

### Server is fully authoritative

Frontend is a dumb renderer. The server owns timing, scoring, hint cooldowns, streak/lives transitions, win detection, answer validation, and player identity. Client messages never carry timestamps or identity claims — server derives both.

**Why:** every cheat vector we considered collapses on this. Naïve "trust the client" submission timestamps were rejected because a modded client trivially mints max-speed scores.

### Server-authoritative timing — RTT-corrected with min RTT

`time_sync` handshake on WS connect (and every 30s). Per-connection rolling RTT window. Score timestamps use **min observed RTT**, capped at 150ms. `round_start` is scheduled 250ms in the future of send; clients use their measured clock offset to fire the local reveal in sync.

**Why min RTT:** a cheater can only inflate measured RTT (delay outbound) — they can't deflate it below the true network floor. Using min denies the inflate-RTT-for-score-correction exploit. The 150ms cap stops anyone on a satellite link from claiming a half-second freebie.

### Per-round push only

The client receives only the current round's puzzle. Future rounds, the answer, the full round queue, and other players' privately-revealed hints all stay server-side. `round_start` payload contains no answer; `round_end` reveals the answer only after the round is settled.

**Why:** keeps cheating to "what the player would have known anyway." Even with full devtools the client can't extract the future or the answer.

### FE computes the mask; BE sends the inputs

`round_start` sends `visibleWord`, `hiddenLength`, `hiddenFirstChar`, `visibleSide`. The FE renders `M_____ Chief` itself. On hint, server pushes `{ index, char }` to the buying player only. FE merges into a local reveal map for render.

**Why:** mask is a presentation concern, not a protocol concern. Smaller payloads, single source of truth in the server's `pair` row.

### Snapshot then delete (not snapshot forever)

`room_snapshots` is overwritten at every `round_end` and **deleted** in the same transaction that writes `games` + `game_players` + `game_rounds` at `game_over`. No tombstone, no cron.

**Why:** snapshots exist for in-flight games only. The `games` table is the permanent record. Keeping snapshots after game-over creates two sources of truth for the same outcome.

### Procedural AI, no LLM

Solo mode's AI is a heuristic + RNG model. Per round it samples `{ willSolve, latencyMs, willUseHint }` from a distribution shaped by persona + rubber-banding against the player's score. Liveness events (`ai_thinking`, `ai_used_hint`, `ai_locked`) are broadcast so solo rooms feel contested.

**Why:** the game is free; spending tokens on an LLM opponent has no business case. Procedural is also more predictable, more tunable, and instant. The rubber-band keeps players engaged better than a fixed-strength AI would.

### SQLite as graph, not Neo4j

Word corpus is `words` (nodes) + `pairs` (edges), both in the main SQLite database. Recursive CTEs cover future graph traversal needs (re-introducing chain mode, "phrases related to X", etc.).

**Why:** zero ops cost. A real graph DB buys nothing the runtime can't get from a 2-table SQL schema today. Promotion to a dedicated corpus service or a graph DB is a future migration if a second consumer ever appears.

### Lift v1's auth (better-auth)

Anonymous accounts auto-created on first contact; regular accounts via email/password. Pro tier exists in the schema but is unlocked-for-all in V1. Session is cookie-based; WS upgrade validates the cookie.

**Why:** v1 already had this working. The trade-offs (cookie complexity, anon table growth) are known. No reason to rewrite.

### Single WS connection per (user, room)

A new WS for the same `(userId, roomCode)` replaces the prior one (old socket closed with `4001 SUPERSEDED`).

**Why:** otherwise a player opens multiple tabs, fires parallel hint requests, and games minimum-cooldown enforcement.

### Edit-distance retry (typo grace), bounded

Submissions that normalize to edit-distance ≤ 1 from a variant trigger a one-shot retry, but only when hidden side is ≥ 5 chars AND first letter exact match. The retry doesn't consume the lock.

**Why:** typos shouldn't end your round. But unbounded edit-distance on short words becomes brute-force. The first-letter + length-floor constraints close that.

### Room codes: non-ambiguous alphabet + recycle cooldown

6-char codes drawn from `[A-Z0-9]` minus ambiguous glyphs (`0`, `O`, `1`, `I`, `L`). Codes are not reused for ~1 hour after the originating game finishes; stale tabs holding old codes are additionally guarded by `gameId` validation at WS upgrade.

**Why:** the alphabet choice prevents real-world misreading ("did the host say zero or oh?"). The cooldown plus gameId binding closes the stale-URL-into-fresh-game collision class.

### Empty-room TTL

`waiting`-state rooms with no active connections for 10 minutes are swept. `playing` rooms past everyone's reconnect grace are also swept.

**Why:** without this, abandoned rooms accumulate in RAM forever.
