// Procedural AI opponent. No LLM. One persona for V1: `steady`.
// Rubber-bands based on score gap so solo doesn't feel rigged.

import type { Room } from "../state/rooms";
import { broadcast } from "../ws/broadcast";

export const AI_USER_ID = "ai__00000000-0000-0000-0000-000000000000";
export const AI_NICKNAME = "AI Opponent";

type AiRoundPlan = {
  willSolve: boolean;
  latencyMs: number;
  willUseHint: boolean;
};

function rubberBandShift(scoreGap: number): number {
  // Positive gap (player ahead): AI becomes slightly better. Negative: weaker.
  return Math.max(-0.2, Math.min(0.2, scoreGap / 5000));
}

function planRound(room: Room, roundDurationMs: number): AiRoundPlan {
  const player = [...room.players.values()].find((p) => !p.isAi);
  const ai = room.players.get(AI_USER_ID);
  const gap = (player?.score ?? 0) - (ai?.score ?? 0);
  const shift = rubberBandShift(gap);

  const baseSolveRate = 0.6 + shift;
  const willSolve = Math.random() < Math.max(0.15, Math.min(0.9, baseSolveRate));

  const minLatency = 400;
  const maxLatency = Math.max(minLatency + 100, roundDurationMs - 200);
  const latencyMs = Math.floor(minLatency + Math.random() * (maxLatency - minLatency));
  const willUseHint = willSolve && Math.random() < 0.15;

  return { willSolve, latencyMs, willUseHint };
}

const timers = new WeakMap<Room, ReturnType<typeof setTimeout>[]>();

function track(room: Room, t: ReturnType<typeof setTimeout>): void {
  const arr = timers.get(room) ?? [];
  arr.push(t);
  timers.set(room, arr);
}

export function cancelAi(room: Room): void {
  for (const t of timers.get(room) ?? []) clearTimeout(t);
  timers.delete(room);
}

export function scheduleAiForRound(
  room: Room,
  onSubmit: (correct: boolean) => void,
  onHint: () => void,
): void {
  const ai = room.players.get(AI_USER_ID);
  const round = room.currentRound;
  if (!ai || !round) return;

  const plan = planRound(room, room.settings.roundTimeMs);

  // Initial "thinking" event a beat after round start.
  track(
    room,
    setTimeout(() => {
      broadcast(room.code, { type: "ai_event", event: "thinking", roundIndex: round.roundIndex });
    }, 250),
  );

  if (plan.willUseHint) {
    track(
      room,
      setTimeout(
        () => {
          broadcast(room.code, {
            type: "ai_event",
            event: "used_hint",
            roundIndex: round.roundIndex,
          });
          onHint();
        },
        Math.max(500, plan.latencyMs / 2),
      ),
    );
  }

  if (plan.willSolve) {
    track(
      room,
      setTimeout(() => {
        broadcast(room.code, { type: "ai_event", event: "locked", roundIndex: round.roundIndex });
        onSubmit(true);
      }, plan.latencyMs),
    );
  } else {
    // Won't solve; never submits. Round ends on timeout for AI.
  }
}
