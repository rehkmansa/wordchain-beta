# Data Model

## Overview

SQLite via `bun:sqlite`, single database file. Stores everything that must outlive a server restart:
- Identity (users, sessions — managed by better-auth)
- Word corpus (graph-shaped: words + pairs)
- Corpus pipeline state (`pair_review_queue`)
- Historical game records (write-once at game end)
- Active-room snapshots for crash/reload recovery (deleted on `game_over`)

Live gameplay state lives in **RAM**, not SQLite — see [ARCHITECTURE.md](./ARCHITECTURE.md) for the hybrid model.

All IDs are UUID v4 (text). Timestamps are ms-since-epoch (integer). JSON columns use SQLite's native JSON1 functions.

---

## Tables

### `users`

Managed by better-auth. Schema reproduced here for reference.

| Column          | Type    | Notes                                        |
| --------------- | ------- | -------------------------------------------- |
| `id`            | text    | PK. UUID.                                    |
| `account_type`  | text    | `anon` \| `regular` \| `pro`. Default `anon`. |
| `email`         | text    | Nullable. Required for `regular`+.           |
| `nickname`      | text    | Display name. Auto-generated for anon.       |
| `token_balance` | integer | Default 0. Schema-ready for V2 economy.      |
| `created_at`    | integer | ms epoch.                                    |
| `updated_at`    | integer | ms epoch.                                    |

Plus better-auth's `session`, `account`, `verification` tables (default better-auth schema, not duplicated here).

**Indexes:** `email` (unique, nullable), `account_type`.

---

### `words`

Corpus node. One row per unique token (case-normalized).

| Column       | Type    | Notes                                       |
| ------------ | ------- | ------------------------------------------- |
| `id`         | text    | PK.                                         |
| `text`       | text    | Canonical, lowercase, trimmed. **Unique.**  |
| `created_at` | integer | ms epoch.                                   |

**Indexes:** `text` (unique).

---

### `pairs`

Corpus edge. One row per validated two-word phrase. `(word_a_id, word_b_id)` is ordered — order in the phrase matters ("Master Chief" ≠ "Chief Master").

| Column        | Type    | Notes                                                            |
| ------------- | ------- | ---------------------------------------------------------------- |
| `id`          | text    | PK.                                                              |
| `word_a_id`   | text    | FK `words.id`. The "left" token.                                 |
| `word_b_id`   | text    | FK `words.id`. The "right" token.                                |
| `variants_a`  | text    | JSON array. Accepted alternates for `word_a` (plurals, possess). |
| `variants_b`  | text    | JSON array. Accepted alternates for `word_b`.                    |
| `freq_tier`   | text    | `common` \| `normal` \| `rare`. Derived from frequency gate.     |
| `source`      | text    | `seed` \| `ai` \| `user`. V1 uses `ai`.                          |
| `validated`   | integer | Boolean (0/1). Eligible for live play only if 1.                 |
| `created_at`  | integer | ms epoch.                                                        |

**Indexes:**
- `(word_a_id, word_b_id)` unique
- `validated, freq_tier` for round generator's sampling query
- `word_a_id`, `word_b_id` separately for graph traversal queries (future chain mode)

---

### `pair_review_queue`

Holding tank for generated candidates awaiting the frequency-gate validation step. Drains into `pairs` on approval.

| Column            | Type    | Notes                                                   |
| ----------------- | ------- | ------------------------------------------------------- |
| `id`              | text    | PK.                                                     |
| `word_a`          | text    | Raw candidate token (not yet in `words`).               |
| `word_b`          | text    | Raw candidate token.                                    |
| `claimed_meta`    | text    | JSON. Whatever the generator emitted (category, usage). |
| `status`          | text    | `pending` \| `approved` \| `rejected`.                  |
| `freq_signal`     | text    | JSON. Results from each frequency source checked.       |
| `reject_reason`   | text    | Nullable.                                               |
| `created_at`      | integer | ms epoch.                                               |
| `processed_at`    | integer | ms epoch, nullable.                                     |

**Indexes:** `status, created_at`.

---

### `games`

Write-once at `game_over`. One row per completed game.

| Column         | Type    | Notes                                                              |
| -------------- | ------- | ------------------------------------------------------------------ |
| `id`           | text    | PK.                                                                |
| `room_code`    | text    | The 6-char code this game used. Not unique across history.         |
| `mode`         | text    | `solo` \| `dual` \| `group`.                                       |
| `host_id`      | text    | FK `users.id`.                                                     |
| `settings`     | text    | JSON snapshot of host config (round_time, chain_length, lives…).  |
| `outcome`      | text    | `completed` \| `abandoned`.                                        |
| `winner_id`    | text    | Nullable FK `users.id`. AI represented as a sentinel UUID.         |
| `started_at`   | integer | ms epoch.                                                          |
| `ended_at`     | integer | ms epoch.                                                          |

**Indexes:** `room_code`, `host_id`, `started_at`.

---

### `game_players`

One row per participant per finished game. AI participants get a sentinel `user_id`.

| Column          | Type    | Notes                                                                       |
| --------------- | ------- | --------------------------------------------------------------------------- |
| `id`            | text    | PK.                                                                         |
| `game_id`       | text    | FK `games.id`.                                                              |
| `user_id`       | text    | FK `users.id` (or AI sentinel).                                             |
| `is_ai`         | integer | Boolean.                                                                    |
| `ai_persona`    | text    | Nullable. e.g. `steady`. NULL for humans.                                   |
| `final_score`   | integer |                                                                             |
| `placement`     | integer | 1 = winner. Ties allowed.                                                   |
| `rounds_solved` | integer | Count of clean solves.                                                      |
| `hints_used`    | integer |                                                                             |
| `eliminated_at` | integer | ms epoch, nullable. Only set if elimination on and player was eliminated.   |
| `disconnected`  | integer | Boolean. True if player abandoned mid-game.                                 |

**Indexes:** `(game_id, placement)`, `user_id`.

---

### `game_rounds`

One row per round of every completed game. Enables replay viewer + audit.

| Column         | Type    | Notes                                                          |
| -------------- | ------- | -------------------------------------------------------------- |
| `id`           | text    | PK.                                                            |
| `game_id`      | text    | FK `games.id`.                                                 |
| `round_index`  | integer | 0-based.                                                       |
| `pair_id`      | text    | FK `pairs.id`. The puzzle for this round.                      |
| `hidden_side`  | text    | `left` \| `right`.                                             |
| `outcomes`     | text    | JSON. Per-player: `{playerId, correct, lockedAt, roundScore, hintsUsed}`. |

**Indexes:** `(game_id, round_index)` unique.

---

### `room_snapshots`

Crash/reload recovery for **active** games. One row per active room, overwritten each round end. Deleted on `game_over`.

| Column           | Type    | Notes                                                       |
| ---------------- | ------- | ----------------------------------------------------------- |
| `room_code`      | text    | PK. The active room code.                                   |
| `game_id`        | text    | The UUID this room is collecting toward `games.id`.         |
| `mode`           | text    | `solo` \| `dual` \| `group`.                                |
| `host_id`        | text    | FK `users.id`.                                              |
| `status`         | text    | `playing` (waiting rooms aren't snapshotted).               |
| `settings`       | text    | JSON.                                                       |
| `current_round`  | integer | 0-based.                                                    |
| `round_queue`    | text    | JSON. Ordered list of all pair IDs for the game.            |
| `players`        | text    | JSON. Per-player live state: score, streak, lives, hints, etc. |
| `updated_at`     | integer | ms epoch.                                                   |

**Indexes:** none beyond PK — only ever looked up by `room_code`.

**Lifecycle:**
- INSERT/UPDATE at every `round_end`
- DELETE on `game_over` (same transaction that writes the `games` row)
- Server-restart sweep on boot: any snapshot whose `game_id` already has a corresponding `games` row → DELETE (orphan cleanup)

---

## Relationships

```
users (1) ─── (N) game_players ─── (1) games
                                       ├── (N) game_rounds ── (N) pairs
                                       └── (1) room_snapshots (until game_over, then deleted)

words (1) ─── (N) pairs.word_a_id
words (1) ─── (N) pairs.word_b_id

pair_review_queue ─→ (approved) ─→ pairs
```

## Indexes

Notable beyond what's listed per-table:

- `pairs (validated, freq_tier)` — feeds the round generator's "sample N pairs at difficulty X" query
- `games (host_id, started_at DESC)` — user profile / "your last games" view (V2)
- `game_players (user_id, final_score DESC)` — eventual leaderboard candidate

## Notes on data lifecycle

- **Active rooms are not in SQLite.** They live in RAM. The only SQLite footprint of an active game is its `room_snapshots` row.
- **Finished games are immutable.** `games` + `game_players` + `game_rounds` are insert-only.
- **Corpus is read-mostly.** `pairs.validated = 1` rows are the live game's read set; treat them as effectively frozen at runtime.
- **No foreign-key cascade deletes** are wired — corpus rows referenced by `game_rounds` must not be deletable. If a pair is revoked (turns out to be a dud), mark `validated = 0` instead of deleting.
