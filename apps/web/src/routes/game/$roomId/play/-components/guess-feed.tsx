import { AnimatePresence, motion } from "framer-motion";
import type { FeedEntry } from "~/lib/mock/use-mock-game";
import { cn } from "~/lib/utils";
import { Avatar } from "~/ui/avatar";

const MAX_ROWS = 6;

export const GuessFeed = ({ entries }: { entries: FeedEntry[] }) => {
  const shown = entries.slice(0, MAX_ROWS);
  const overflow = entries.length - shown.length;

  if (entries.length === 0) {
    return (
      <div className="grid place-items-center px-6 py-10 text-center font-sans text-[14px] text-grey-400">
        No one's solved yet — be the first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {shown.map((e) => (
          <motion.div
            key={e.id}
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2",
              e.isYou ? "bg-brand-purple-500/10" : "hover:bg-grey-300/8",
            )}
          >
            <Avatar name={e.nickname} seed={e.playerId} size="sm" />
            <span className="flex-1 truncate font-sans text-[14px] text-grey-700">
              <span className="font-semibold">{e.isYou ? "You" : e.nickname}</span> solved
            </span>
            <span className="font-sans font-semibold text-[14px] text-success-600 tabular-nums">
              +{e.roundScore.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
      {overflow > 0 && (
        <div className="px-3 py-1.5 font-sans text-[13px] text-grey-400">
          +{overflow.toLocaleString()} others solved
        </div>
      )}
    </div>
  );
};
