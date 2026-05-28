import { ERROR_CODES, type ErrorCode, type GameOverMsg, type RoundEndMsg } from "@repo/shared";
import { sampleRoundQueue } from "../corpus/sampler";
import { db } from "../db";
import { newId } from "../lib/ids";
import { markCodeRecycled } from "../state/room-codes";
import {
  minPlayersFor,
  type Room,
  type RoundPlayerState,
  type RoundState,
  rooms,
} from "../state/rooms";
import { deleteSnapshot, writeSnapshot } from "../state/snapshot";
import { broadcast, broadcastRoomState, send } from "../ws/broadcast";
import { connectionFor } from "../ws/connections";
import { rttHalfCorrection } from "../ws/time-sync";
import { AI_USER_ID, cancelAi, scheduleAiForRound } from "./ai-player";
import { validateAnswer } from "./answer-validator";
import { applyHint } from "./hint-engine";
import { loadPair } from "./round-loader";
import { hintCooldownMs, maxHintsFor, nextMultiplierAfterCleanSolve, roundScore } from "./scoring";

const ROUND_START_LEAD_MS = 250;
const ROUND_END_GRACE_MS = 250;
const INTERLUDE_MS = 3000;

export async function startGame(room: Room): Promise<void> {
  if (room.status !== "waiting") return;
  if (room.players.size < minPlayersFor(room.mode)) return;

  const queue = sampleRoundQueue(room.settings.chainLength);
  room.roundQueue = queue;
  room.status = "playing";
  room.startedAt = Date.now();

  broadcastRoomState(room);
  startRound(room, 0);
}

function startRound(room: Room, idx: number): void {
  const pairId = room.roundQueue[idx];
  if (!pairId) {
    endGame(room, "completed");
    return;
  }
  const pair = loadPair(pairId);
  if (!pair) {
    endGame(room, "abandoned");
    return;
  }

  const hiddenSide: "left" | "right" = Math.random() < 0.5 ? "left" : "right";
  const visibleWord = hiddenSide === "left" ? pair.wordB : pair.wordA;
  const hiddenWord = hiddenSide === "left" ? pair.wordA : pair.wordB;
  const hiddenVariants = hiddenSide === "left" ? pair.variantsA : pair.variantsB;

  const now = Date.now();
  const roundStartsAt = now + ROUND_START_LEAD_MS;
  const roundEndsAt = roundStartsAt + room.settings.roundTimeMs;

  const perPlayer = new Map<string, RoundPlayerState>();
  for (const p of room.players.values()) {
    if (p.eliminatedAt !== null) continue;
    perPlayer.set(p.id, {
      locked: false,
      correct: false,
      lockedAt: null,
      roundScore: 0,
      revealedIndexes: [],
      hintsUsed: 0,
      hintCooldownUntil: 0,
      streakBrokenThisRound: false,
    });
  }

  const round: RoundState = {
    roundIndex: idx,
    pairId: pair.id,
    visibleSide: hiddenSide === "left" ? "right" : "left",
    visibleWord,
    hiddenWord,
    hiddenVariants,
    roundStartsAt,
    roundEndsAt,
    endTimer: null,
    nextTimer: null,
    perPlayer,
  };
  room.currentRound = round;

  const maxHints = maxHintsFor(hiddenWord.length);
  const cooldown = hintCooldownMs(room.settings, maxHints);

  for (const p of room.players.values()) {
    if (p.isAi || p.eliminatedAt !== null) continue;
    send(room.code, p.id, {
      type: "round_start",
      roundIndex: idx,
      visibleSide: round.visibleSide,
      visibleWord,
      hiddenLength: hiddenWord.length,
      hiddenFirstChar: hiddenWord[0] ?? "",
      roundStartsAt,
      roundEndsAt,
      maxHints,
      hintCooldownMs: cooldown,
      yourState: {
        points: p.score,
        streak: p.streak,
        multiplier: p.multiplier,
        livesLeft: p.livesLeft,
      },
    });
  }

  // Schedule AI submission if there's an AI player in this room.
  if (room.players.has(AI_USER_ID)) {
    scheduleAiForRound(
      room,
      (correct) => {
        void room.mutex.run(() => {
          if (room.currentRound !== round) return;
          submitAiAnswer(room, correct);
        });
      },
      () => {
        void room.mutex.run(() => {
          if (room.currentRound !== round) return;
          applyHint(room, AI_USER_ID, Date.now());
        });
      },
    );
  }

  round.endTimer = setTimeout(
    () => {
      void room.mutex.run(() => {
        if (room.currentRound !== round) return;
        finalizeRound(room);
      });
    },
    roundEndsAt - now + ROUND_END_GRACE_MS,
  );
}

function submitAiAnswer(room: Room, correct: boolean): void {
  const round = room.currentRound;
  if (!round) return;
  const state = round.perPlayer.get(AI_USER_ID);
  const player = room.players.get(AI_USER_ID);
  if (!state || !player || state.locked) return;

  const now = Date.now();
  const effectiveMs = Math.max(0, now - round.roundStartsAt);

  state.locked = true;
  state.lockedAt = effectiveMs;
  state.correct = correct;

  if (correct) {
    const score = roundScore(effectiveMs, room.settings.roundTimeMs, player.multiplier);
    state.roundScore = score;
    player.score += score;
    if (state.streakBrokenThisRound) {
      // already 0
    } else {
      player.streak += 1;
      player.multiplier = nextMultiplierAfterCleanSolve(player.multiplier);
    }
  } else {
    player.streak = 0;
    player.multiplier = 1;
    if (player.livesLeft !== null) {
      player.livesLeft -= 1;
      if (player.livesLeft <= 0) player.eliminatedAt = now;
    }
  }

  broadcast(room.code, {
    type: "player_locked",
    roundIndex: round.roundIndex,
    playerId: AI_USER_ID,
  });

  if (allLocked(round)) finalizeRound(room);
}

function allLocked(round: RoundState): boolean {
  for (const s of round.perPlayer.values()) {
    if (!s.locked) return false;
  }
  return true;
}

export function handleSubmit(
  room: Room,
  userId: string,
  roundIndex: number,
  answer: string,
): { code: ErrorCode } | { ok: true } {
  const round = room.currentRound;
  if (!round) return { code: ERROR_CODES.ROUND_NOT_OPEN };
  if (round.roundIndex !== roundIndex) return { code: ERROR_CODES.WRONG_ROUND };

  const state = round.perPlayer.get(userId);
  const player = room.players.get(userId);
  if (!state || !player) return { code: ERROR_CODES.ROOM_NOT_FOUND };
  if (state.locked) return { code: ERROR_CODES.ALREADY_LOCKED };

  const result = validateAnswer(answer, round.hiddenWord, round.hiddenVariants);
  if (result.kind === "near_miss") return { code: ERROR_CODES.EDIT_DISTANCE_RETRY };

  const correct = result.kind === "correct";
  const ws = connectionFor(userId, room.code);
  const rttHalf = ws ? rttHalfCorrection(ws) : 0;
  const serverNow = Date.now();
  const effectiveMs = Math.max(0, serverNow - rttHalf - round.roundStartsAt);

  state.locked = true;
  state.correct = correct;
  state.lockedAt = effectiveMs;

  let scored = 0;
  if (correct) {
    scored = roundScore(effectiveMs, room.settings.roundTimeMs, player.multiplier);
    state.roundScore = scored;
    player.score += scored;
    if (!state.streakBrokenThisRound) {
      player.streak += 1;
      player.multiplier = nextMultiplierAfterCleanSolve(player.multiplier);
    }
  } else {
    player.streak = 0;
    player.multiplier = 1;
    if (player.livesLeft !== null) {
      player.livesLeft -= 1;
      if (player.livesLeft <= 0) player.eliminatedAt = serverNow;
    }
  }

  send(room.code, userId, {
    type: "answer_result",
    roundIndex,
    correct,
    lockedAt: effectiveMs,
    roundScore: scored,
    newAccumulated: player.score,
    newStreak: player.streak,
    newMultiplier: player.multiplier,
  });

  broadcast(room.code, { type: "player_locked", roundIndex, playerId: userId });

  if (allLocked(round)) finalizeRound(room);
  return { ok: true };
}

function finalizeRound(room: Room): void {
  const round = room.currentRound;
  if (!round) return;
  if (round.endTimer) {
    clearTimeout(round.endTimer);
    round.endTimer = null;
  }
  cancelAi(room);

  const perPlayer: RoundEndMsg["perPlayer"] = [];
  for (const [id, state] of round.perPlayer) {
    const p = room.players.get(id);
    if (!p) continue;
    perPlayer.push({
      playerId: id,
      correct: state.correct,
      locked: state.locked,
      lockedAt: state.lockedAt,
      roundScore: state.roundScore,
      totalScore: p.score,
      streak: p.streak,
      multiplier: p.multiplier,
      hintsUsed: state.hintsUsed,
      livesLeft: p.livesLeft,
    });
  }

  // Persist round outcome for replay
  db.run(
    "INSERT INTO game_rounds (id, game_id, round_index, pair_id, hidden_side, outcomes) VALUES (?, ?, ?, ?, ?, ?)",
    [
      newId(),
      room.gameId,
      round.roundIndex,
      round.pairId,
      round.visibleSide === "left" ? "right" : "left",
      JSON.stringify(
        perPlayer.map((p) => ({
          playerId: p.playerId,
          correct: p.correct,
          lockedAt: p.lockedAt,
          roundScore: p.roundScore,
          hintsUsed: p.hintsUsed,
        })),
      ),
    ],
  );

  const aliveCount = countActive(room);
  const isLastRound = round.roundIndex + 1 >= room.roundQueue.length;
  const earlyEnd = aliveCount < minPlayersFor(room.mode);
  const nextRoundStartsAt =
    isLastRound || earlyEnd ? null : Date.now() + INTERLUDE_MS + ROUND_START_LEAD_MS;

  broadcast(room.code, {
    type: "round_end",
    roundIndex: round.roundIndex,
    answer: round.hiddenWord,
    perPlayer,
    nextRoundStartsAt,
  });

  writeSnapshot(room);

  if (nextRoundStartsAt === null) {
    setTimeout(() => {
      void room.mutex.run(() => endGame(room, "completed"));
    }, INTERLUDE_MS);
    return;
  }

  round.nextTimer = setTimeout(() => {
    void room.mutex.run(() => {
      if (room.status !== "playing") return;
      startRound(room, round.roundIndex + 1);
    });
  }, INTERLUDE_MS);
}

function countActive(room: Room): number {
  let n = 0;
  for (const p of room.players.values()) {
    if (p.eliminatedAt === null && !p.disconnected) n += 1;
  }
  return n;
}

export function endGame(room: Room, outcome: "completed" | "abandoned"): void {
  if (room.status === "finished") return;
  cancelAi(room);
  if (room.currentRound?.endTimer) clearTimeout(room.currentRound.endTimer);
  if (room.currentRound?.nextTimer) clearTimeout(room.currentRound.nextTimer);
  room.status = "finished";

  const sorted = [...room.players.values()].sort((a, b) => b.score - a.score);
  const standings: GameOverMsg["standings"] = sorted.map((p, idx) => ({
    playerId: p.id,
    nickname: p.nickname,
    isAi: p.isAi,
    placement: idx + 1,
    finalScore: p.score,
  }));
  const winnerId = sorted[0]?.id ?? null;

  const tx = db.transaction(() => {
    db.run(
      "INSERT INTO games (id, room_code, mode, host_id, settings, outcome, winner_id, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        room.gameId,
        room.code,
        room.mode,
        room.hostId,
        JSON.stringify(room.settings),
        outcome,
        winnerId,
        room.startedAt ?? Date.now(),
        Date.now(),
      ],
    );
    for (const [idx, p] of sorted.entries()) {
      const roundsSolved = countSolvesFor(room, p.id);
      db.run(
        "INSERT INTO game_players (id, game_id, user_id, is_ai, ai_persona, final_score, placement, rounds_solved, hints_used, eliminated_at, disconnected) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          newId(),
          room.gameId,
          p.id,
          p.isAi ? 1 : 0,
          p.aiPersona,
          p.score,
          idx + 1,
          roundsSolved,
          p.hintsUsedTotal,
          p.eliminatedAt,
          p.disconnected ? 1 : 0,
        ],
      );
    }
    deleteSnapshot(room.code);
  });
  tx();

  broadcast(room.code, { type: "game_over", gameId: room.gameId, outcome, standings });

  rooms.delete(room.code);
  markCodeRecycled(room.code);
}

function countSolvesFor(_room: Room, playerId: string): number {
  const row = db
    .query<{ n: number }, [string, string]>(
      `SELECT COUNT(*) as n
       FROM game_rounds
       WHERE game_id = ?
         AND json_extract(outcomes, '$') LIKE '%' || ? || '%' AND outcomes LIKE '%"correct":true%'`,
    )
    .get(_room.gameId, playerId);
  return row?.n ?? 0;
}
