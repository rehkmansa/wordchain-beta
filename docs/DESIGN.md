# Worchain — Game Design Document

## Concept

Worchain is a competitive compound word game. Each round, players are shown half of a compound word and must identify the full word.

**Example:** `Head M****` → `Headmaster`

Rounds are independent — each is a fresh puzzle with no dependency on the previous.

**Design philosophy:** Quick rush, quick refuel. Games start and end fast. Nobody is idle. Look away and you miss it.

---

## Core Mechanic

Every round, all players receive the **same compound word puzzle simultaneously**. A timer runs and players type their answer before it expires.

**Skill expression = vocabulary depth + typing speed**

---

## Game Modes

| Mode | Description | Status |
|---|---|---|
| Solo | Player vs AI | Ship |
| Dual | 2 players | Ship |
| Group | N players | Ship |
| Multiplayer | Shared link join flow | Future |

All modes run the same core mechanic. Mode only changes player count and which optional rules apply.

---

## Round Structure

- Chain length = number of rounds (10 links = 10 rounds)
- All players receive the same puzzle simultaneously each round
- Rounds are fully independent — no word carries over

---

## Scoring

```
round_score = base_points × speed_weight × streak_multiplier
```

| Component | Definition |
|---|---|
| `base_points` | Fixed per round, set at game level |
| `speed_weight` | Sliding scale. Solve instantly = near full base. Solve at last second = near 0 |
| `streak_multiplier` | Ongoing multiplier from streak. Starts at 1x, caps at 2x |
| `accumulated_points` | Running total across rounds. Hint usage drains this bank |

---

## Hint System

Hints reveal one character at a time from the hidden portion of the compound word.

### Rules

| Rule | Detail |
|---|---|
| **Max hints per round** | `Math.floor(word.length / 2)` — 4 hidden chars = 2 hints, 6 hidden = 3 hints |
| **Cost** | 10% of `base_points` deducted from `accumulated_points` per hint used |
| **Cooldown** | `(roundTime - Math.max(roundTime / 3, 10)) / maxHints` — guarantees at least 1/3 of round time (min 10s) remains for typing after all hints used |
| **Point gate** | Must have accumulated points to use hint. No bank = no hint |
| **Streak impact** | See Streak System |

### Cooldown Examples

| Round Time | Buffer | Max Hints | Cooldown |
|---|---|---|---|
| 15s | 10s | 2 | 2.5s |
| 15s | 10s | 3 | 1.67s |
| 30s | 10s | 2 | 10s |
| 45s | 15s | 3 | 10s |
| 60s | 20s | 2 | 20s |
| 60s | 20s | 3 | 13.3s |

---

## Streak System

A streak is built by solving consecutive rounds **without using a hint**.

### Multiplier

- Climbs per clean round, caps at **2x**
- Applies to every subsequent round until broken
- Implementation curve is an engineering decision

### Hint and Streak Interaction

**One rule: hint always resets streak counter to 0.**

| State | Use Hint | Effect |
|---|---|---|
| No streak | Hint used, round solved | Counter stays 0. Round does not count toward starting a streak |
| Active streak | Hint used, round solved | Streak ends. Counter resets to 0. Multiplier lost |

Streaks are rare. They are the high-skill reward. Most players will not sustain them.

---

## Failing a Round

| Consequence | Detail |
|---|---|
| Round score | 0 |
| Streak | Reset to 0 |
| Lives | Lose one (only if elimination is enabled) |
| Accumulated points | Untouched |

---

## Lives and Elimination

Lives only exist when the host enables elimination. Otherwise the mechanic does not apply.

**Elimination off (default):**
- No lives
- Fail = 0 points, game continues
- All rounds play out, highest score wins

**Elimination on:**
- Players start with host-defined lives (default: 3)
- Fail a round = lose a life automatically (no proactive burn)
- No lives left = eliminated
- Last player standing wins. Points determine dominance between survivors.

---

## Round Outcomes Summary

| Action | Round Score | Accumulated Points | Streak | Lives (elim. on) |
|---|---|---|---|---|
| Solve clean | Full (speed × streak) | Untouched | Continues / builds | Untouched |
| Solve with hint | Full (speed × streak) | Drained 10% of base | Reset to 0 | Untouched |
| Fail | 0 | Untouched | Reset to 0 | Lose one |
| Fail after hint | 0 | Drained 10% of base | Reset to 0 | Lose one |

---

## Host Configuration

Minimal by design. Sensible defaults, few toggles.

| Setting | Options | Default |
|---|---|---|
| Round timer | 10s / 15s / 20s / 30s / 60s | 15s |
| Chain length | Host sets | 10 |
| Elimination | On / Off | Off |
| Lives | Host sets (if elimination on) | 3 |

---

## Competitive Design Principles

1. **Nobody is idle** — simultaneous rounds, everyone active every round
2. **Every round matters from round 1** — no lives buffer by default, every 0 is felt
3. **Look away and you miss it** — short timers create genuine, unrelenting tension
4. **Skill has two axes** — vocabulary (do you know the word?) and speed (can you type it in time?)
5. **Hints are a real sacrifice** — they drain your bank, reset your streak, and cost you time via cooldown
6. **Streaks reward mastery** — rare, high multiplier, high risk. Losing one to a hint is genuinely painful for the player who earned it
