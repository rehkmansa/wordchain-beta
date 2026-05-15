# Scope

## V1 — MVP

### In Scope

**Game modes**
- **Solo** — 1 human + 1 procedural AI opponent. Starts immediately on create, no lobby.
- **Dual** — 2 humans. Auto-starts when 2nd player joins.
- **Group** — N humans (2–8). Host clicks "Start" when ready.

**Game mechanics** (per [DESIGN.md](./DESIGN.md))
- Simultaneous round-based puzzle play
- Two-word phrase puzzles with randomized hidden side
- First letter of hidden side always revealed
- Hints reveal one additional letter, cost % of accumulated points, reset streak
- Scoring: `base × speed × streak_multiplier`
- Optional elimination (lives, host-configurable)
- Chain length (round count) configurable, default 10
- Round timer configurable: 10s / 15s / 20s / 30s / 60s, default 15s

**Auth**
- Anonymous accounts (auto-created on first visit, cookie-backed)
- Regular accounts (email + password) via better-auth
- Pro tier exists in schema but is **unlocked for all** in V1 (no payment gating yet)

**Real-time infrastructure**
- WebSocket gameplay with server-authoritative timing
- RTT-corrected scoring (min-RTT, capped)
- Scheduled `roundStartsAt` (future-anchored) for fair round starts
- Clock-sync handshake on WS connect
- Per-round push (no future round data leaks to client)
- Server-side answer normalization + canonical/variant matching

**Persistence**
- Word corpus stored as graph in SQLite (words + pairs)
- Users persisted (better-auth tables)
- Finished games + per-player results logged
- Active-room snapshot at every round end → enables crash/reload recovery
- Snapshot deleted on `game_over`

**Corpus pipeline**
- Generation (LLM batch, offline)
- Frequency-gate validation (external bigram signal)
- Tiering by frequency → drives both corpus quality and AI difficulty modulation
- `pair_review_queue` for pre-validation backlog

**Anti-cheat**
- No future-round or answer leakage
- Server normalizes and validates every submission
- Replay defense via `roundIndex`
- One WS connection per (player, room)
- `gameId` validation guards against stale-URL collisions

**Reconnect / resume**
- Within-grace reconnect (~60s) picks up mid-round state
- Server crash recovery via snapshot rehydrate
- Post-game-over result fetch by room code (`GET /games/by-room/:roomCode`)

### Out of Scope (V1)

- Payments, token purchasing, pro feature gating
- Leaderboards
- Friends list / matchmaking
- User-submitted word chains and moderation queue
- AI chain validation (LLM-based)
- Cross-device session sync for regular accounts
- Mobile app wrap (Capacitor / native)
- Push notifications
- Mid-game host transfer / promotion
- Spectator mode
- Rematch flow as a first-class feature (manual: create new room)
- Horizontal scaling / multi-server room distribution

## V2+

Future version boundaries will be drawn here as the V1 launch surfaces real needs. Likely candidates:
- Pro gating and payments (token economy)
- Leaderboards and seasonal ranking
- User chain submission with moderation
- Mobile wrap
- Multi-server architecture once a single VPS strains
