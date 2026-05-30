import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect } from "react";
import { cn } from "~/lib/utils";
import { Emoji } from "~/ui/emoji";

// ── Streak + multiplier pill ────────────────────────────────────────────────
// `pulse` is a counter the play screen bumps on every streak-up / streak-max so
// the pill pops and a flame floats off — the celebration the chain earns.
export const StreakPill = ({
  multiplier,
  streak,
  pulse = 0,
}: {
  multiplier: number;
  streak: number;
  pulse?: number;
}) => {
  const atCap = multiplier >= 2;
  const active = multiplier > 1 || streak > 0;
  const flames = atCap ? 2 : 1;
  const controls = useAnimationControls();

  useEffect(() => {
    if (pulse > 0) controls.start({ scale: [1, 1.28, 1] }, { duration: 0.4, ease: "easeOut" });
  }, [pulse, controls]);

  return (
    <motion.div
      animate={controls}
      className={cn(
        "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans font-semibold text-[14px] tabular-nums",
        active ? "bg-amber-500/20 text-amber-500" : "bg-white/8 text-white/45",
        atCap && "animate-pulse ring-2 ring-amber-500/60",
      )}
    >
      {/* flame floats up on each streak gain */}
      <AnimatePresence>
        {pulse > 0 && (
          <motion.span
            key={pulse}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], y: -26, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2"
          >
            <Emoji name="fire" size={20} />
          </motion.span>
        )}
      </AnimatePresence>

      {active ? (
        <span className="flex items-center -space-x-1">
          {Array.from({ length: flames }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed flame slots
            <Emoji key={i} name="fire" size={18} />
          ))}
        </span>
      ) : (
        <Emoji name="dash" size={16} className="opacity-60" />
      )}
      <span>×{multiplier.toFixed(1)}</span>
      {atCap && <span className="ml-0.5 text-[11px] font-bold tracking-wide">MAX</span>}
    </motion.div>
  );
};

// ── Lives row ───────────────────────────────────────────────────────────────
export const Lives = ({ livesLeft, total }: { livesLeft: number; total: number }) => (
  <div role="img" aria-label={`${livesLeft} of ${total} lives`} className="flex items-center gap-1">
    <AnimatePresence initial={false}>
      {Array.from({ length: total }, (_, i) => {
        const alive = i < livesLeft;
        return (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional heart slots
            key={i}
            animate={alive ? { scale: 1 } : { scale: [1.3, 0.9, 1] }}
            transition={{ duration: 0.3 }}
          >
            <Emoji
              name={alive ? "heart" : "heartBroken"}
              size={20}
              className={cn(!alive && "opacity-70 grayscale")}
            />
          </motion.span>
        );
      })}
    </AnimatePresence>
  </div>
);

// ── Combined HUD card ───────────────────────────────────────────────────────
export const PlayerHud = ({
  multiplier,
  streak,
  livesLeft,
  totalLives,
  pulse,
}: {
  multiplier: number;
  streak: number;
  livesLeft: number | null;
  totalLives: number;
  pulse?: number;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-3">
    <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-white/40">
      You
    </span>
    <div className="flex items-center gap-3">
      <StreakPill multiplier={multiplier} streak={streak} pulse={pulse} />
      {livesLeft !== null && <Lives livesLeft={livesLeft} total={totalLives} />}
    </div>
  </div>
);
