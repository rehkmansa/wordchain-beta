import { playSfx } from "~/lib/audio/sfx";
import { subscribeFeedback } from "./bus";

// Maps feedback events onto procedural sounds. Self-registers on import.
subscribeFeedback((e) => {
  switch (e.kind) {
    case "roundStart":
      playSfx("start");
      break;
    case "correct":
      playSfx("correct");
      break;
    case "streakUp":
      // climb the pitch as the chain grows (2 semitones per level, capped)
      playSfx("streak", { transpose: Math.min((e.level - 2) * 2, 12) });
      break;
    case "streakMax":
      playSfx("streakMax");
      break;
    case "streakBreak":
      playSfx("streakBreak");
      break;
    case "wrong":
      playSfx("wrong");
      break;
    case "hint":
      playSfx("hint");
      break;
    case "opponentLock":
      playSfx("opponent");
      break;
    case "win":
      playSfx("win");
      break;
    case "lose":
      playSfx("lose");
      break;
  }
});
