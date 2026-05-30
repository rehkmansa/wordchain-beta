import type { ServerMessage } from "@repo/shared";
import type { GameState } from "~/lib/game/types";

// Semantic feedback events — what just happened, decoupled from how we react
// to it (sound / haptics / visuals each subscribe independently).
export type FeedbackEvent =
  | { kind: "roundStart" }
  | { kind: "correct" }
  | { kind: "streakUp"; level: number }
  | { kind: "streakMax" }
  | { kind: "streakBreak" }
  | { kind: "wrong" }
  | { kind: "hint" }
  | { kind: "opponentLock" }
  | { kind: "win" }
  | { kind: "lose" };

// Derive events from a server message by diffing against the pre-message state.
// Streak detection needs the previous streak/multiplier, which only the prior
// state holds — so this runs before the reducer commits the message.
export const deriveFeedback = (
  prev: GameState,
  msg: ServerMessage,
  youId: string,
): FeedbackEvent[] => {
  const me = prev.room.players.find((p) => p.id === youId);

  switch (msg.type) {
    case "round_start":
      return [{ kind: "roundStart" }];

    case "answer_result": {
      if (!msg.correct) return [{ kind: "wrong" }];
      // hitting the 2x cap is its own celebration
      if (msg.newMultiplier >= 2 && (me?.multiplier ?? 1) < 2) return [{ kind: "streakMax" }];
      // a genuine chain (2+ clean solves), not just the first correct
      if (msg.newStreak >= 2) return [{ kind: "streakUp", level: msg.newStreak }];
      return [{ kind: "correct" }];
    }

    case "hint_revealed": {
      // a hint always resets the streak — if one was active, that loss is the story
      const hadStreak = (me?.streak ?? 0) >= 1 || (me?.multiplier ?? 1) > 1;
      return [{ kind: hadStreak ? "streakBreak" : "hint" }];
    }

    case "player_locked":
      return msg.playerId === youId ? [] : [{ kind: "opponentLock" }];

    case "game_over": {
      const standing = msg.standings.find((s) => s.playerId === youId);
      return [{ kind: standing?.placement === 1 ? "win" : "lose" }];
    }

    default:
      return [];
  }
};
