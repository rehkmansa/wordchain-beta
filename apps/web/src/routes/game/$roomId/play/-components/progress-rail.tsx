import { motion } from "framer-motion";
import type { RoundHistory } from "~/lib/mock/use-mock-game";
import { cn } from "~/lib/utils";
import { CheckIcon, CloseIcon, LockIcon } from "~/ui/icons";
import { ScrollArea } from "~/ui/scroll-area";

type RailProps = {
  total: number;
  currentIndex: number;
  history: RoundHistory[];
};

const byIndex = (history: RoundHistory[]) => {
  const map = new Map<number, RoundHistory>();
  for (const h of history) map.set(h.index, h);
  return map;
};

const ordinal = (n: number) => String(n).padStart(2, "0");

// ── Vertical rail (desktop sidebar) ─────────────────────────────────────────
export const ProgressRail = ({ total, currentIndex, history }: RailProps) => {
  const map = byIndex(history);
  return (
    <ScrollArea className="min-h-0 flex-1" tone="white">
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const done = map.get(i);
          const active = i === currentIndex && !done;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional round slots
              key={i}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
                active && "bg-white/15 ring-1 ring-white/25",
                done && "bg-white/5",
                !active && !done && "opacity-45",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full font-sans font-semibold text-[11px] tabular-nums",
                  active
                    ? "bg-amber-500 text-white"
                    : done
                      ? "bg-white/15 text-white/80"
                      : "bg-white/10 text-white/50",
                )}
              >
                {ordinal(i + 1)}
              </span>

              {done ? (
                <>
                  <span className="flex-1 truncate font-sans font-semibold text-[14px] text-white/90 capitalize">
                    {done.compound}
                  </span>
                  {done.youCorrect ? (
                    <CheckIcon size={18} variant="Bold" className="shrink-0 text-success-500" />
                  ) : (
                    <CloseIcon size={18} variant="Bold" className="shrink-0 text-danger-500/80" />
                  )}
                </>
              ) : active ? (
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
                  className="flex-1 font-sans font-semibold text-[14px] text-white"
                >
                  In play…
                </motion.span>
              ) : (
                <span className="flex flex-1 items-center gap-2 font-sans text-[14px] text-white/45">
                  <LockIcon size={15} variant="Bold" /> Locked
                </span>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

// ── Horizontal dot strip (mobile) ───────────────────────────────────────────
export const ProgressDots = ({ total, currentIndex, history }: RailProps) => {
  const map = byIndex(history);
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      {Array.from({ length: total }, (_, i) => {
        const done = map.get(i);
        const active = i === currentIndex && !done;
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional round slots
            key={i}
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full font-sans font-semibold text-[11px] tabular-nums",
              active && "bg-amber-500 text-white ring-2 ring-white/40",
              done && (done.youCorrect ? "bg-success-500 text-white" : "bg-white/15 text-white/60"),
              !active && !done && "bg-white/10 text-white/40",
            )}
          >
            {done ? "" : i + 1}
            {done?.youCorrect && <CheckIcon size={14} variant="Bold" />}
          </span>
        );
      })}
    </div>
  );
};
