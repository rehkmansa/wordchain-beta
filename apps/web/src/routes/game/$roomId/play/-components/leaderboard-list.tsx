import type { PublicPlayer } from "@repo/shared";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { Avatar } from "~/ui/avatar";
import { Emoji, type EmojiName } from "~/ui/emoji";
import { HeartIcon } from "~/ui/icons";

const MEDAL: Record<number, EmojiName> = { 1: "medalGold", 2: "medalSilver", 3: "medalBronze" };

const Row = ({
  player,
  rank,
  isYou,
  elimination,
  pinned,
}: {
  player: PublicPlayer;
  rank: number;
  isYou: boolean;
  elimination: boolean;
  pinned?: boolean;
}) => (
  <motion.div
    layout
    className={cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5",
      isYou ? "bg-brand-purple-500/12 ring-1 ring-brand-purple-500/25" : "hover:bg-grey-300/8",
      pinned && "sticky bottom-0 bg-white shadow-[0_-6px_16px_rgba(31,18,77,0.08)]",
    )}
  >
    <span className="grid w-7 shrink-0 place-items-center font-sans font-semibold text-[14px] text-grey-400 tabular-nums">
      {MEDAL[rank] ? <Emoji name={MEDAL[rank] as EmojiName} size={22} /> : rank}
    </span>
    <Avatar name={player.nickname} seed={player.id} size="sm" connected={player.connected} />
    <span className="flex-1 truncate font-sans font-semibold text-[14px] text-grey-700">
      {isYou ? "You" : player.nickname}
      {player.isAi && <span className="ml-1.5 text-[11px] text-grey-400">AI</span>}
    </span>
    {elimination && player.livesLeft !== null && (
      <span className="flex items-center gap-0.5 text-[13px] text-grey-400 tabular-nums">
        <HeartIcon size={14} variant="Bold" className="text-danger-500" />
        {player.livesLeft}
      </span>
    )}
    <span className="font-sans font-semibold text-[14px] text-grey-800 tabular-nums">
      {player.score.toLocaleString()}
    </span>
  </motion.div>
);

export const LeaderboardList = ({
  players,
  youId,
  elimination,
}: {
  players: PublicPlayer[];
  youId: string;
  elimination: boolean;
}) => {
  const youRank = players.findIndex((p) => p.id === youId);
  const visibleCount = 12;
  const youOutsideView = youRank >= visibleCount;
  const shown = players.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-1">
      {shown.map((p, i) => (
        <Row key={p.id} player={p} rank={i + 1} isYou={p.id === youId} elimination={elimination} />
      ))}
      {players.length > visibleCount && (
        <div className="px-3 py-1.5 text-center font-sans text-[12px] text-grey-400">
          {players.length - visibleCount} more players
        </div>
      )}
      {youOutsideView && players[youRank] && (
        <Row player={players[youRank]} rank={youRank + 1} isYou elimination={elimination} pinned />
      )}
    </div>
  );
};
