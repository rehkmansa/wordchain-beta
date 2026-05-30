import type { RoundStartMsg } from "@repo/shared";
import { AnimatePresence, motion } from "framer-motion";
import { type FormEvent, useMemo } from "react";
import { playSfx } from "~/lib/audio/sfx";
import { cn } from "~/lib/utils";
import { CountdownBar } from "~/ui/countdown";
import { Emoji } from "~/ui/emoji";
import { CheckIcon } from "~/ui/icons";
import { WordTile } from "~/ui/word-tile";
import { HintButton } from "./hint-button";

export type RoundLock = { correct: boolean; roundScore: number };

type CurrentRoundProps = {
  roundNumber: number;
  start: RoundStartMsg;
  phase: "armed" | "open";
  now: number;
  typed: string;
  onType: (v: string) => void;
  onSubmit: () => void;
  onHint: () => void;
  hints: Array<{ index: number; char: string }>;
  hintsUsed: number;
  score: number;
  cooldownUntil: number | null;
  nearMiss: boolean;
  lock: RoundLock | null;
  spectator?: boolean;
};

// the compound puzzle — visible word + hidden tiles, orientation by visibleSide
const CompoundWord = ({
  start,
  hints,
  lock,
  solvedAnswer,
}: {
  start: RoundStartMsg;
  hints: Array<{ index: number; char: string }>;
  lock: RoundLock | null;
  solvedAnswer: string | null;
}) => {
  const hintMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of hints) m.set(h.index, h.char);
    return m;
  }, [hints]);

  const visibleTiles = start.visibleWord.split("").map((ch, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: positional tiles, index is the identity
    <WordTile key={i} char={ch} variant="visible" size="md" />
  ));

  const missed = lock !== null && !lock.correct;
  const solved = lock?.correct ?? false;

  const hiddenTiles = Array.from({ length: start.hiddenLength }, (_, i) => {
    if (solved && solvedAnswer) {
      return (
        <WordTile
          // biome-ignore lint/suspicious/noArrayIndexKey: positional tiles, index is the identity
          key={i}
          char={solvedAnswer[i]}
          variant="correct"
          size="md"
          reveal
          delay={i * 0.05}
        />
      );
    }
    const revealed = i === 0 ? start.hiddenFirstChar : hintMap.get(i);
    if (revealed) {
      // biome-ignore lint/suspicious/noArrayIndexKey: positional tiles, index is the identity
      return <WordTile key={i} char={revealed} variant="hint" size="md" reveal={i !== 0} />;
    }
    // biome-ignore lint/suspicious/noArrayIndexKey: positional tiles, index is the identity
    return <WordTile key={i} variant={missed ? "wrong" : "blank"} size="md" />;
  });

  const hiddenGroup = (
    <motion.div
      key="hidden"
      animate={missed ? { x: [0, -8, 8, -5, 5, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap gap-1.5"
    >
      {hiddenTiles}
    </motion.div>
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      {start.visibleSide === "left" ? (
        <>
          <div className="flex flex-wrap gap-1.5">{visibleTiles}</div>
          {hiddenGroup}
        </>
      ) : (
        <>
          {hiddenGroup}
          <div className="flex flex-wrap gap-1.5">{visibleTiles}</div>
        </>
      )}
    </div>
  );
};

export const CurrentRound = ({
  roundNumber,
  start,
  phase,
  now,
  typed,
  onType,
  onSubmit,
  onHint,
  hints,
  hintsUsed,
  score,
  cooldownUntil,
  nearMiss,
  lock,
  spectator,
}: CurrentRoundProps) => {
  const armed = phase === "armed";
  const locked = lock !== null;
  const total = start.roundEndsAt - start.roundStartsAt;
  const remaining = Math.max(0, start.roundEndsAt - now);
  const solvedAnswer = lock?.correct ? typed.trim().toUpperCase() : null;

  const remainingHints = start.maxHints - hintsUsed;
  const cooldownRemaining = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;
  const gatedReason =
    remainingHints <= 0 ? "HINTS_EXHAUSTED" : score < 100 ? "INSUFFICIENT_POINTS" : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-3xl bg-white/8 px-6 py-6 backdrop-blur-sm sm:gap-7 sm:px-10 sm:py-8">
      <span className="font-sans font-semibold text-[13px] uppercase tracking-[0.18em] text-white/55">
        Round {roundNumber}
      </span>

      <CompoundWord start={start} hints={hints} lock={lock} solvedAnswer={solvedAnswer} />

      {/* countdown */}
      <div className="w-full max-w-md">
        {armed ? (
          <div className="text-center font-sans font-semibold text-[15px] text-white/70">
            Get ready…
          </div>
        ) : (
          <CountdownBar remaining={remaining} total={total} paused={locked} />
        )}
      </div>

      {spectator ? (
        <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-2xl bg-white/5 py-6">
          <Emoji name="heartBroken" size={32} />
          <span className="font-sans font-semibold text-[16px] text-white/80">
            Eliminated · watching
          </span>
          <span className="font-sans text-[13px] text-white/50">
            You're out — follow the rest of the chain.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3">
          {/* inline near-miss */}
          <AnimatePresence>
            {nearMiss && !locked && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 py-2 font-sans font-semibold text-[14px] text-amber-500"
              >
                <Emoji name="bang" size={16} /> Close — check your spelling and try again
              </motion.div>
            )}
          </AnimatePresence>

          <input
            value={typed}
            onChange={(e) => onType(e.target.value)}
            disabled={armed || locked}
            placeholder={armed ? "Get ready…" : "Type your guess…"}
            aria-label="Your guess"
            // biome-ignore lint/a11y/noAutofocus: speed game — the guess box wants focus the instant the round opens
            autoFocus
            className={cn(
              "h-15 w-full rounded-2xl border-2 bg-white/95 px-5 text-center font-sans font-semibold text-[20px] text-grey-800 tracking-[-0.01em] outline-none transition-colors",
              "placeholder:text-grey-300 disabled:opacity-60",
              nearMiss
                ? "border-amber-500"
                : locked && lock?.correct
                  ? "border-success-500"
                  : locked
                    ? "border-danger-500"
                    : "border-transparent focus:border-brand-purple-400",
            )}
          />

          <HintButton
            cost={100}
            remaining={remainingHints}
            cooldownRemainingMs={cooldownRemaining}
            gatedReason={gatedReason}
            onClick={onHint}
            disabled={armed || locked}
          />

          {locked ? (
            <div
              className={cn(
                "flex h-16 items-center justify-center gap-2 rounded-2xl font-sans font-semibold text-[18px]",
                lock?.correct
                  ? "bg-success-500/20 text-success-500"
                  : "bg-danger-500/20 text-danger-500",
              )}
            >
              {lock?.correct ? (
                <>
                  <CheckIcon size={24} variant="Bold" /> Locked in +
                  {lock.roundScore.toLocaleString()}
                </>
              ) : (
                <>
                  <Emoji name="sad" size={22} /> Missed — 0 this round
                </>
              )}
            </div>
          ) : (
            <button
              type="submit"
              onPointerDown={() => playSfx("tap")}
              disabled={armed || !typed.trim()}
              className={cn(
                "h-16 w-full overflow-hidden rounded-2xl bg-white font-sans font-semibold text-[18px] text-brand-purple-600 shadow-[0_8px_22px_rgba(31,18,77,0.28)] outline-none cursor-hand",
                "transition-[transform,filter] duration-150 hover:enabled:brightness-95 active:enabled:scale-[0.985]",
                "disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-brand-purple-600/50 disabled:shadow-none",
              )}
            >
              Guess
            </button>
          )}
        </form>
      )}
    </div>
  );
};
