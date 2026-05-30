# Workflows

User flows the application must support. V1 = group mode; solo/dual share the same core mechanic.

## Create & host a group game
**Trigger:** Landing → "Create Room"
**Steps:**
1. Host configures settings — chain length (3–20, default 10), round time (10/15/20/30/60s, default 15), elimination (off by default; lives 1–9 when on).
2. `POST /rooms` → `{ roomCode, gameId, wsUrl }`.
3. Host lands in the Lobby, connected over WS; sees join count + presence.
4. Host clicks "Start" (enabled at ≥2 players) → `start_game`.
**Result:** Game begins; first round is pushed.

## Join a group game
**Trigger:** Landing → "Join Room"
**Steps:**
1. Enter 6-char room code (alphanumeric, no ambiguous chars).
2. `GET /rooms/:code` validates (errors: not found / already started / game-id mismatch).
3. WS connect (`join_room`); joiner lands in the Lobby with no Start — "waiting for host".
**Result:** Joiner waits in the lobby until the host starts.

## Play a round (×N)
**Trigger:** `round_start`
**Steps:**
1. The same compound puzzle goes to all players; one word visible, blanks for the other (first hidden char shown); live countdown from `roundStartsAt`→`roundEndsAt`.
2. Player submits once. Correct → speed × streak score; wrong → locked for the round (0, streak reset, −1 life if elimination). Near-miss (single typo) → retry prompt, no lock.
3. Optional hints: cost 100 from `score`, cooldown, max `floor(hidden/2)`; the first hint of a round breaks the streak.
4. Round ends when all players lock or the timer expires → `round_end` (answer revealed, per-player results) → 3 s interlude → next round.
**Result:** After the last round (or an early end), the game is over.

## Game over
**Trigger:** last round finalized, or early end (active players < min)
**Steps:** `game_over` → standings sorted by final score (placement). Podium + your placement.
**Result:** Player can Leave (→ landing) or start a New game (→ create flow). No in-place rematch in V1.

## Sub-flows
- **Leave / disband:** the host leaving disbands the room for everyone (confirm modal); a participant leaving just exits.
- **Elimination:** at 0 lives a player is eliminated → spectator view (sees chain / leaderboard / feed, no input).
- **Reconnect:** within grace (~60 s), a WS reconnect rehydrates the current round and player state.
