import type { RoundEndMsg, RoundStartMsg } from "@repo/shared";
import { motion } from "framer-motion";
import { CountdownRing } from "~/ui/countdown";
import { Emoji } from "~/ui/emoji";
import { WordTile } from "~/ui/word-tile";

export const RoundInterlude = ({
  roundEnd,
  start,
  youId,
  now,
}: {
  roundEnd: RoundEndMsg;
  start: RoundStartMsg;
  youId: string;
  now: number;
}) => {
  const you = roundEnd.perPlayer.find((p) => p.playerId === youId);
  const answer = roundEnd.answer;
  const visibleTiles = start.visibleWord.split("").map((ch, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: positional tiles, index is the identity
    <WordTile key={i} char={ch} variant="visible" size="md" />
  ));
  const answerTiles = answer.split("").map((ch, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: positional tiles, index is the identity
    <WordTile key={i} char={ch} variant="correct" size="md" reveal delay={i * 0.05} />
  ));

  const nextIn = roundEnd.nextRoundStartsAt ? Math.max(0, roundEnd.nextRoundStartsAt - now) : 0;
  const isLast = roundEnd.nextRoundStartsAt === null;

  return (
    <motion.div
      className="absolute inset-0 z-30 grid place-items-center p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-brand-purple-900/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.92, y: 14, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="relative flex w-full max-w-xl flex-col items-center gap-6 rounded-3xl bg-white/10 px-8 py-9 text-center"
      >
        <span className="font-sans font-semibold text-[13px] uppercase tracking-[0.18em] text-white/55">
          Answer
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {start.visibleSide === "left" ? (
            <>
              <div className="flex flex-wrap gap-1.5">{visibleTiles}</div>
              <div className="flex flex-wrap gap-1.5">{answerTiles}</div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">{answerTiles}</div>
              <div className="flex flex-wrap gap-1.5">{visibleTiles}</div>
            </>
          )}
        </div>

        {/* your result */}
        {you && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/8 px-5 py-3">
            {you.correct ? (
              <>
                <span className="font-sans font-semibold text-[20px] text-success-500 tabular-nums">
                  +{you.roundScore.toLocaleString()}
                </span>
                {you.multiplier > 1 && (
                  <span className="flex items-center gap-1 font-sans font-semibold text-[15px] text-amber-500">
                    <Emoji name="fire" size={16} /> ×{you.multiplier.toFixed(1)}
                  </span>
                )}
              </>
            ) : (
              <span className="flex items-center gap-2 font-sans font-semibold text-[17px] text-white/70">
                <Emoji name="sad" size={18} /> No points this round
              </span>
            )}
          </div>
        )}

        {/* next */}
        <div className="flex items-center gap-3 text-white/75">
          {isLast ? (
            <span className="font-sans font-semibold text-[16px]">Tallying final results…</span>
          ) : (
            <>
              <CountdownRing remaining={nextIn} total={3000} />
              <span className="font-sans font-semibold text-[16px]">Next round…</span>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
