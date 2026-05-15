# Architecture

## Overview

Two apps + shared packages, one Bun runtime:

```
apps/
  web/         — React + Vite SPA
  backend/     — Hono server on Bun
packages/
  shared/      — types/constants used by both apps
  lint-rules/  — local ESLint plugin (Tailwind hygiene, feature boundaries)
```

Frontend talks to the backend over HTTP for room create/join, then upgrades to a websocket for live gameplay (TBD when backend lands).

## Frontend

### Route-driven feature scoping

A feature is a route folder. Each route owns its private internals via `-`-prefixed sibling folders (`-components/`, `-hooks/`, `-lib/`, `-types/`). TanStack Router ignores `-` folders, so the URL graph is unaffected. Imports of these private folders are confined to the owning route by lint (see `docs/DECISIONS.md`).

Global, reusable code lives outside `routes/`:

```
apps/web/src/
  ui/      ← design-system primitives shared across features
  lib/     ← global helpers
  hooks/   ← global hooks
  routes/
    __root.tsx               ← app shell
    _splash.tsx              ← pathless layout (splash background persists across nav)
    _splash/
      index.tsx              ← /
      game/create.tsx        ← /game/create
      -components/           ← private to _splash layout group
    game/$roomId/
      lobby.tsx              ← /game/:roomId/lobby
      play.tsx               ← /game/:roomId/play
      -components/           ← private to game/$roomId
```

### Layout persistence

Routes that benefit from a persistent background (the splash animation, in particular) sit under a pathless layout route (`_splash.tsx`). Navigating between siblings under that layout swaps only `<Outlet />`; the layout component and its state survive. The layout unmounts when the user leaves it (e.g. entering `/game/:roomId/lobby`), which intentionally tears down the splash animation.

### State management

For now: local component state + URL params. Will introduce a query/socket layer once the backend exists.

### Styling

Tailwind v4 with theme tokens declared in `apps/web/src/app.css` `@theme`. No arbitrary values for color, sizing, spacing, positioning, or text — see DECISIONS.md.

## Backend

Hono on Bun, single process. Two transports (REST + WebSocket) on one port. State is split by temperature: hot game state in RAM, cold/durable state in SQLite.

### Process layout

```
apps/backend/src/
  index.ts              ─ Bun.serve entry; wires HTTP + WS upgrade
  auth/                 ─ better-auth integration (session, anon bootstrap)
  db/
    index.ts            ─ bun:sqlite handle, WAL setup
    schema.sql          ─ migrations (raw SQL, applied at boot)
    queries.ts          ─ typed query helpers (no ORM)
  routes/
    rooms.ts            ─ POST /rooms, GET /rooms/:code
    games.ts            ─ GET /games/by-room/:code, GET /games/:id
    auth.ts             ─ POST /auth/anon + better-auth handlers
  ws/
    handler.ts          ─ upgrade handler, single-connection enforcement
    time-sync.ts        ─ clock-sync handshake, RTT tracker
    room-manager.ts     ─ in-memory Map<roomCode, Room>; mutex per room
    round-scheduler.ts  ─ round_start scheduling, deadline + grace
    answer-validator.ts ─ normalization, canonical+variant match, edit-distance grace
    scoring.ts          ─ base × speed × multiplier, streak transitions
    hint-engine.ts      ─ cooldown tracking, reveal index selection
    snapshot.ts         ─ round-end snapshot write, crash rehydrate
    ai-player.ts        ─ procedural opponent (rubber-banding, persona)
  corpus/
    generator.ts        ─ LLM batch generation (offline CLI)
    freq-gate.ts        ─ external bigram signal checks
    importer.ts         ─ pair_review_queue → pairs promotion
    sampler.ts          ─ round queue construction (sample N without replacement)
  lib/
    rate-limit.ts       ─ per-IP / per-user limiters
    logger.ts
```

### State model — hybrid by temperature

**In RAM** (lives and dies with the process / room):
- `Map<roomCode, Room>` — every active room
- `Room`: settings, players, host, status, current round, round queue, per-player live state (score, streak, multiplier, lives, hints, cooldowns, locked answer)
- Per-connection: WS handle, RTT window, clock offset, last-seen timestamp
- AI opponent state per solo room

**In SQLite** (durable):
- `users`, better-auth tables — identity
- `words`, `pairs`, `pair_review_queue` — corpus, read-mostly
- `games`, `game_players`, `game_rounds` — finished games, write-once
- `room_snapshots` — one row per active game, overwritten at every `round_end`, deleted on `game_over`

The boundary is strict: nothing about a live round (per-tick state, mid-round answers, hint timing) ever hits SQLite outside the round-end snapshot. The hot path is pure memory operations.

### Authority

The server is fully authoritative on every game-state question:
- Round timing (`roundStartsAt`, `roundEndsAt`)
- Answer validation (normalize, match canonical + variants, edit-distance grace)
- Scoring (RTT-corrected timestamp, speed weight, streak multiplier)
- Hint cooldowns and cost
- Streak/lives transitions, win/elimination detection
- Player identity (derived from session cookie at WS upgrade, never trusted from message bodies)

The frontend is a thin renderer. It never computes anything that affects correctness.

### Latency and timing model

Two latency problems, both solved server-side:

**1. Submit latency (scoring fairness).**
Server measures RTT per connection via a `time_sync` handshake at connect + every 30s. Maintains a rolling sample window per connection. For score-relevant correction, uses **min observed RTT** (not median) — a cheater can only inflate their measured RTT, never deflate it below the true floor. Correction is capped at 150ms; honest players above that cap are slightly disadvantaged on score, but the cap denies an exploit path.

Effective submit time = `serverReceivedAt - min(minRtt/2, 150ms) - roundStartsAt`.

**2. Round-start latency (round-time fairness).**
Server doesn't emit "go now." It schedules `round_start` ~250ms in the future of send. Each client applies its measured clock offset to fire the local reveal at the same effective wall-clock moment regardless of ping. Anyone with > 250ms ping is slightly disadvantaged on round-start (still fair on score) — a corner-case acceptable for V1.

**Deadline grace:** server accepts `submit_answer` up to `roundEndsAt + 250ms` (scoring still anchored to `roundEndsAt`). Stops borderline submits from feeling unfair.

### Room lifecycle

```
[Create]
  POST /rooms → server inserts Room into RAM Map, generates room_code
              (collision check against active set, 30^6 non-ambiguous alphabet)
              Recycle cooldown: codes from games finished in the last hour are blocked
              ↓
[Wait]      status = "waiting"
              Players connect via WS, ?room=CODE&gameId=UUID
              Mutex per room serializes join / leave / start-game transitions
              Empty-room TTL: 10 min idle in waiting → swept
              ↓
[Play]      status = "playing"
              No new joiners. Connection drops trigger reconnect grace (60s).
              Round scheduler fires rounds. round_end → snapshot write.
              ↓
[Finished]  status = "finished"
              Persist games + game_players + game_rounds + DELETE room_snapshots
              (single SQLite transaction)
              Room remains in RAM briefly for game_over message delivery (~30s),
              then dropped from RAM. Subsequent reload uses GET /games/by-room.
```

### Round engine

Per round:
1. Sampler picks the next pair from the room's pre-generated queue
2. Random hidden side chosen
3. Server emits `round_start` to all players at `roundStartsAt = now + 250ms`
4. AI player (solo only) is scheduled to "submit" at a sampled time based on persona + rubber-band against current score gap
5. Players submit. Validator normalizes + matches. Single-shot lock (with edit-distance retry exception).
6. Each `submit_answer` → private `answer_result` to submitter + `player_locked` broadcast
7. Round ends when all players locked OR `roundEndsAt + 250ms` reached
8. Server gathers per-player outcomes, applies streak/lives transitions
9. Snapshot write to SQLite
10. `round_end` broadcast with answer revealed + per-player outcomes + `nextRoundStartsAt`
11. ~3s interlude → next round

### Procedural AI (no LLM)

`ai-player.ts` is pure heuristics + RNG. Per round it samples `{ willSolve: bool, latencyMs: number, willUseHint: bool }` from a distribution tuned by:
- **Persona** (V1 ships one: `steady`)
- **Rubber-banding** — distribution shifts based on score gap. Player way ahead → AI tighter. AI way ahead → AI looser. Always bounded: `[15%, 90%]` solve rate.
- **Liveness events** — AI emits `ai_event` messages (`thinking`, `used_hint`, `locked`) during the round so solo rooms feel contested.

No external calls. Costs nothing per round. Free-to-play compatible.

### Corpus pipeline

Offline, run via CLI from `apps/backend`:

```
[generator]   LLM batch → JSON candidates with {a, b, claimed_category, example}
                                              ↓
[freq-gate]   For each candidate, query external bigram signals
              (Google Ngrams API, Wiktionary, Wikipedia title match, DataMuse)
              Compute tier: common / normal / rare
              Zero hits everywhere → reject
                                              ↓
[importer]    Surviving candidates → pair_review_queue (status=pending)
              Frequency-passed → auto-promote to pairs (validated=1, source=ai)
              Below threshold → stays pending for optional manual review
```

The runtime never invokes the generator or the gate. Live games sample only from `pairs WHERE validated = 1`.

### Anti-cheat boundaries

See [API.md](./API.md#anti-cheat-constraints-summary) for the full mapping. The architecture-level enforcement points:

- **WS upgrade handler** — cookie + gameId validation, single-connection enforcement
- **Room mutex** — atomic state transitions (join, leave, start, round_end)
- **Answer validator** — normalization + canonical/variant match + edit-distance constraints
- **Scoring module** — RTT correction with min-RTT, cap
- **Snapshot writer** — atomic transaction at round_end (no partial state)
- **Code recycler** — gameId binding defeats stale-URL collisions

## Data Flow

### Create + join (Dual / Group)

```
Host browser ─POST /api/rooms─────→ Backend
                                       ├─ Insert into Map<roomCode, Room>
                                       └─ Return { roomCode, gameId }
Host browser ──open WS────────────→ Backend
                                       ├─ Upgrade auth (cookie + gameId)
                                       ├─ time_sync handshake
                                       └─ Send room_state

Host shares /game/:roomCode/lobby URL ─→ Friend's browser
Friend ─anon-auth (if cookie missing)─→ Backend
Friend ──open WS─────────────────→ Backend
                                       ├─ Join under room mutex
                                       └─ Broadcast room_state to all in room

[Dual: 2nd join triggers auto-start]
[Group: host sends start_game]
                                       Backend:
                                         ├─ Mutex flip status to "playing"
                                         ├─ Sample round queue
                                         ├─ Schedule round 1 (now + 250ms)
                                         └─ Broadcast round_start
```

### Round play

```
All clients ◄─round_start────────── Backend
                                       └─ Round scheduler armed for roundEndsAt

Client ──submit_answer──→ Backend
                            ├─ Validator (normalize + match + edit-distance gate)
                            ├─ Scoring (RTT-corrected timestamp)
                            ├─ Snapshot intent
                            ├─ Reply private answer_result
                            └─ Broadcast player_locked (no correctness)

(other clients submit similarly, OR roundEndsAt elapses)

Backend ──round_end transaction:
            ├─ Apply streak/lives transitions
            ├─ UPSERT room_snapshots (one row)
            └─ Broadcast round_end (answer revealed)

[loop until last round]

Backend ──game_over transaction:
            ├─ INSERT games + game_players + game_rounds
            ├─ DELETE room_snapshots
            └─ Broadcast game_over
            ─(after ~30s)─ Drop room from RAM Map
```

### Crash / reload recovery

```
[Server crash mid-game]
Server restarts ─ RAM Map empty
                ─ On boot: SELECT * FROM room_snapshots
                  Drop any snapshot whose game_id is already in games table
                  (orphans from a crash mid-game-over transaction)

Player browser (still on /game/:roomCode/play)
  ──reconnect WS──→ Backend
                       ├─ Room not in RAM → look up snapshot by roomCode
                       ├─ Rehydrate Room into RAM from snapshot
                       ├─ Re-attach player connection
                       └─ Schedule next round_start (between-rounds state from snapshot)

[Tab reload mid-round, no crash]
  ──reconnect WS──→ Backend
                       ├─ Existing room in RAM, find matching userId
                       ├─ Replace prior socket (single-connection enforcement)
                       └─ Re-send current round_start (original roundEndsAt unchanged)
```

### Solo lifecycle

```
POST /api/rooms { mode: "solo" }
  └─ Backend instantiates Room + AIPlayer
  └─ Status flips straight to "playing" (no lobby wait)

WS connect → time_sync → room_state → first round_start scheduled

Per round:
  AIPlayer schedules its own "submit" timer based on persona + rubber-band
  Player submits → answer_result private
  AI's scheduled submit fires → counted same as a human submission
  round_end resolves

[Same snapshot/recovery semantics as multiplayer; AI state in snapshot]
```
