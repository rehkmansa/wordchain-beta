# API

## Overview

- **Transport:** REST over HTTP for setup/lifecycle; WebSocket for live gameplay.
- **Base URL:** `/api`
- **Auth:** Cookie-based via better-auth. Anon users are auto-created on first contact. All endpoints (REST and WS upgrade) require a valid session cookie — backend bootstraps anon on missing cookie.
- **Time:** All times in responses are ms-since-epoch (UTC), authoritative from the server.

## REST Endpoints

### Auth (better-auth surface)

better-auth provides standard endpoints (`/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/sign-out`, `/api/auth/session`, etc.). Anon bootstrap is via a custom route:

#### `POST /api/auth/anon`
Creates an anonymous user + session if none exists. Idempotent — returns the existing session if one is present.

**Response:** `200 { user: { id, account_type: "anon", nickname }, sessionExpiresAt }`

---

### Rooms

#### `POST /api/rooms`
Create a new room. Caller becomes host.

**Request:**
```ts
{
  mode: "solo" | "dual" | "group",
  settings: {
    chainLength: number,      // 3-20, default 10
    roundTimeMs: number,      // one of [10000, 15000, 20000, 30000, 60000]
    elimination: boolean,
    lives?: number,           // required if elimination=true, default 3
    aiDifficulty?: "easy" | "normal" | "hard"  // required if mode="solo"
  }
}
```

**Response:** `201 { roomCode, gameId, wsUrl: "/api/ws?room=ABC123" }`

**Errors:**
- `400 INVALID_SETTINGS` — out-of-range or missing required setting
- `429 TOO_MANY_ROOMS` — caller already hosts an active room (rate cap)

#### `GET /api/rooms/:roomCode`
Lightweight pre-flight before opening a WS — checks if room exists and is joinable.

**Response:** `200 { roomCode, gameId, mode, status: "waiting" | "playing", playerCount, maxPlayers, settings }`

**Errors:**
- `404 ROOM_NOT_FOUND`
- `410 ROOM_LOCKED` — game already started, can't join
- `409 ROOM_FULL`

---

### Games (post-completion)

#### `GET /api/games/by-room/:roomCode`
Fetch the final results of a finished game by its room code. Used by `/game/:roomCode/over` page on reload, after the room is gone from RAM.

**Response:** `200 { game: {...}, players: [...], rounds: [...] }`

**Errors:**
- `404 NOT_FOUND` — no completed game found for this code

#### `GET /api/games/:gameId`
Same as above but by `gameId`. Stable across room-code recycling.

---

## WebSocket Protocol

### Connection

**URL:** `/api/ws?room=<roomCode>&gameId=<gameId>`

**Upgrade auth:** Session cookie validated at upgrade handshake. Invalid/missing cookie → upgrade rejected with `401`.

`gameId` is validated against the active room's gameId. Mismatch (e.g. stale tab against a recycled code) → upgrade rejected with `409 GAME_ID_MISMATCH`.

**Single-connection invariant:** server enforces one active WS per `(userId, roomCode)`. A new connection for the same pair **replaces** the prior one; the prior socket is closed with code `4001 SUPERSEDED`.

### Connection lifecycle

```
1. Client connects (HTTP upgrade)
2. Server validates cookie + gameId, upgrades
3. Server → time_sync (immediate)
4. Client → time_sync_ack with measured offset
5. Server → room_state (current snapshot)
6. From here: bidirectional message exchange until disconnect
```

### Clock-sync handshake

Performed on every WS connect (and re-fired every 30s for drift correction).

**Server → Client: `time_sync`**
```ts
{
  type: "time_sync",
  serverTime: number,         // server's ms-since-epoch at send
  pingId: string              // correlates this round-trip
}
```

**Client → Server: `time_sync_ack`**
```ts
{
  type: "time_sync_ack",
  pingId: string,
  clientReceivedAt: number,   // client's ms when it received the time_sync
  clientSendingAt: number     // client's ms when it sent the ack
}
```

Server uses `(serverReceivedAck - serverSentSync - (clientSendingAt - clientReceivedAt)) / 2` as RTT for this sample. Maintains a rolling window per connection; uses **min RTT** (capped at 150ms) for any score-relevant correction.

---

### Server → Client messages

#### `room_state`
Sent on connect, on join/leave, on lobby setting changes, on game-state transition.

```ts
{
  type: "room_state",
  roomCode: string,
  gameId: string,
  mode: "solo" | "dual" | "group",
  status: "waiting" | "playing" | "finished",
  host: { id, nickname },
  settings: {...},
  players: [{ id, nickname, isHost, isAi, connected, score, streak, multiplier, livesLeft, hintsUsedTotal }],
  currentRoundIndex: number | null,
  totalRounds: number
}
```

#### `round_start`
Per-round push. Sent when a round begins. FE renders mask from `visibleWord` + `hiddenLength` + `hiddenFirstChar`.

```ts
{
  type: "round_start",
  roundIndex: number,
  visibleSide: "left" | "right",
  visibleWord: string,
  hiddenLength: number,
  hiddenFirstChar: string,
  roundStartsAt: number,       // server-time, ~250ms in future of send
  roundEndsAt: number,
  maxHints: number,
  hintCooldownMs: number,
  yourState: {
    points: number,
    streak: number,
    multiplier: number,
    livesLeft: number | null   // null if elimination off
  }
}
```

The answer is **never** in this payload, nor in any other.

#### `hint_revealed`
Sent **only to the requesting player** after a successful `request_hint`. Other players never see hint reveals from another player's perspective.

```ts
{
  type: "hint_revealed",
  roundIndex: number,
  index: number,               // 0-based position in hidden word
  char: string,
  hintsUsedNow: number,
  pointsRemaining: number,
  cooldownExpiresAt: number    // server-time
}
```

#### `answer_result`
Private response to the submitting player.

```ts
{
  type: "answer_result",
  roundIndex: number,
  correct: boolean,
  lockedAt: number,            // ms into round, RTT-corrected
  roundScore: number,
  newAccumulated: number,
  newStreak: number,
  newMultiplier: number
}
```

#### `player_locked`
Broadcast to other players when someone (including the submitter on retry-disabled mode) finalizes their answer. **Correctness is not leaked.**

```ts
{
  type: "player_locked",
  roundIndex: number,
  playerId: string
}
```

#### `ai_event`
Liveness signals for solo mode, so the round doesn't feel empty.

```ts
{
  type: "ai_event",
  event: "thinking" | "used_hint" | "locked",
  roundIndex: number
}
```

#### `round_end`
Broadcast when the round resolves (all locked, OR `roundEndsAt` passes + grace).

```ts
{
  type: "round_end",
  roundIndex: number,
  answer: string,              // canonical form, hidden side
  perPlayer: [{
    playerId: string,
    correct: boolean,
    locked: boolean,
    lockedAt: number | null,
    roundScore: number,
    totalScore: number,
    streak: number,
    multiplier: number,
    hintsUsed: number,
    livesLeft: number | null
  }],
  nextRoundStartsAt: number | null  // null if game ending after this
}
```

#### `game_over`
Final standings. Room is dropped from RAM after this message; `room_snapshots` row is deleted in the same transaction that writes `games` + `game_players` + `game_rounds`.

```ts
{
  type: "game_over",
  gameId: string,
  outcome: "completed" | "abandoned",
  standings: [{ playerId, nickname, isAi, placement, finalScore }]
}
```

#### `error`
Validation or protocol failure. Server stays connected — client decides whether to surface.

```ts
{
  type: "error",
  code: string,                // see error codes below
  message: string,
  context?: object
}
```

---

### Client → Server messages

All messages include `roundIndex` where relevant; mismatches are rejected silently (with `error` reply).

#### `join_room`
Sent immediately after the time_sync ack completes.

```ts
{ type: "join_room", roomCode: string }
```

#### `start_game`
Host only. Triggers transition from `waiting` to `playing`.

```ts
{ type: "start_game" }
```

#### `submit_answer`
```ts
{ type: "submit_answer", roundIndex: number, answer: string }
```

Single-shot in V1: once submitted (right or wrong), player is locked for the round. Server applies edit-distance grace: if normalized input is distance ≤ 1 from any variant **AND** the word's hidden side is ≥ 5 chars **AND** first letter matches, server replies `error EDIT_DISTANCE_RETRY` instead of locking, allowing one retry. This shields against typos without enabling brute-force.

#### `request_hint`
```ts
{ type: "request_hint", roundIndex: number }
```

Server checks: cooldown elapsed, hints remaining > 0, player has ≥ hint cost, player hasn't locked. Hint reveal is the next un-revealed index in the hidden word.

#### `leave_room`
Voluntary leave (not just tab close). In lobby: just removes player. In-game: marked as abandoned, counts as fail/forfeit for remaining rounds.

```ts
{ type: "leave_room" }
```

---

## Error model

Every error response (REST or WS `error` message) uses a code + message shape.

### Common codes

| Code | Meaning |
|------|---------|
| `UNAUTHENTICATED` | Missing or invalid session |
| `ROOM_NOT_FOUND` | Room code doesn't map to an active room |
| `ROOM_LOCKED` | Game already started, can't join |
| `ROOM_FULL` | Room at max capacity |
| `GAME_ID_MISMATCH` | Stale URL; the room with this code is a different game now |
| `INVALID_SETTINGS` | Out-of-range or missing host configuration |
| `TOO_MANY_ROOMS` | Caller already hosts an active room |
| `NOT_HOST` | Non-host attempted host-only action |
| `WRONG_ROUND` | Action's `roundIndex` doesn't match server's current |
| `ROUND_NOT_OPEN` | Round hasn't started, has ended, or no round active |
| `ALREADY_LOCKED` | Player has already locked this round |
| `EDIT_DISTANCE_RETRY` | Near-miss; player may try again this round |
| `HINT_COOLDOWN` | Hint requested before cooldown elapsed |
| `HINTS_EXHAUSTED` | Player has used all available hints this round |
| `INSUFFICIENT_POINTS` | Not enough accumulated points to buy a hint |
| `RATE_LIMITED` | Caller is hitting endpoint rate limits |
| `INTERNAL` | Unexpected server error |

### REST error shape

```ts
{ error: { code: string, message: string, context?: object } }
```

Status codes: 400 for validation, 401/403 for auth, 404 for missing, 409 for conflict, 410 for gone (room locked), 429 for rate-limited, 500 for internal.

### WS error message shape

```ts
{ type: "error", code: string, message: string, context?: object }
```

Errors over WS never disconnect the client. The server stays connected; the client decides UX response.

---

## Anti-cheat constraints summary

| Attack | Defense |
|--------|---------|
| Client-supplied submission timestamp | Server uses its own receive time, RTT-corrected with min-RTT (capped 150ms) |
| Future-round leakage | Per-round push; only current round in any payload |
| Answer leakage | Answer never sent until `round_end` |
| Multi-tab concurrent hints | Single-WS-per-(user,room); new connection supersedes old |
| Replay of old submit packet | `roundIndex` validated; `ALREADY_LOCKED` rejected |
| Stale URL into recycled room | `gameId` validated at WS upgrade |
| Asymmetric latency inflation | RTT correction capped (150ms); player can only hurt themselves above cap |
| Spoofed `playerId` in message body | Server derives `userId` from session cookie at upgrade; message bodies never carry identity |
| Spam anon account creation | IP rate limit on `POST /api/auth/anon` |
| Brute-force via typo grace | Edit-distance retry only for hidden length ≥ 5 AND first letter exact match |

## Rate limits (defaults)

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/anon` | 5 / min / IP |
| `POST /api/rooms` | 10 / hour / user |
| `submit_answer` (WS) | implicit via single-shot lock |
| `request_hint` (WS) | implicit via cooldown |
| `time_sync_ack` (WS) | 1 / 5s per connection |
