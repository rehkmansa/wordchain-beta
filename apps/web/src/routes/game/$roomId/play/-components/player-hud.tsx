import { AnimatePresence, motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { Emoji } from "~/ui/emoji";

// ── Streak + multiplier pill ────────────────────────────────────────────────
export const StreakPill = ({ multiplier, streak }: { multiplier: number; streak: number }) => {
  const atCap = multiplier >= 2;
  const active = multiplier > 1 || streak > 0;
  const flames = atCap ? 2 : 1;

  return (
    <motion.div
      key={active ? `on-${multiplier}` : "off"}
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans font-semibold text-[14px] tabular-nums",
        active ? "bg-amber-500/20 text-amber-500" : "bg-white/8 text-white/45",
      )}
    >
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
}: {
  multiplier: number;
  streak: number;
  livesLeft: number | null;
  totalLives: number;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-3">
    <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-white/40">
      You
    </span>
    <div className="flex items-center gap-3">
      <StreakPill multiplier={multiplier} streak={streak} />
      {livesLeft !== null && <Lives livesLeft={livesLeft} total={totalLives} />}
    </div>
  </div>
);
