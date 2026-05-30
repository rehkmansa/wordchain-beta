import type { GameOverMsg } from "@repo/shared";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { selectYou, useGame } from "~/lib/game/provider";
import { cn } from "~/lib/utils";
import { Avatar } from "~/ui/avatar";
import { Emoji, type EmojiName } from "~/ui/emoji";
import { ScrollArea } from "~/ui/scroll-area";

type Standing = GameOverMsg["standings"][number];

const heroEmoji = (placement: number): EmojiName =>
  placement === 1
    ? "trophy"
    : placement === 2
      ? "medalSilver"
      : placement === 3
        ? "medalBronze"
        : "sad";

const PODIUM_MEDAL: Record<number, EmojiName> = {
  1: "medalGold",
  2: "medalSilver",
  3: "medalBronze",
};

export const Page = () => {
  const navigate = useNavigate();
  const { state } = useGame();
  const you = selectYou(state);

  const standings = state.gameOver?.standings ?? [];
  const yourStanding = standings.find((s) => s.playerId === you.id);
  const placement = yourStanding?.placement ?? standings.length;
  const won = placement === 1;

  const title = won
    ? "You Win!"
    : placement === 2
      ? "2nd Place"
      : placement === 3
        ? "3rd Place"
        : `${placement}th Place`;
  const subtitle = won
    ? "Champion of the chain — fastest mind in the room."
    : `You finished ahead of ${Math.max(0, standings.length - placement)} players.`;

  const podium = standings.slice(0, 3);
  const rest = standings.slice(3);
  const youInRest = rest.find((s) => s.playerId === you.id);
  const youOutsidePodium = !podium.some((s) => s.playerId === you.id);

  return (
    <div
      className={cn(
        "relative min-h-screen text-white lg:h-screen lg:overflow-hidden",
        won
          ? "bg-linear-to-b from-brand-purple-500 to-brand-purple-800"
          : "bg-linear-to-b from-danger-500 to-danger-600",
      )}
    >
      <Burst won={won} />

      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center px-6 py-8 lg:h-full">
        {/* hero (fixed) */}
        <div className="flex shrink-0 flex-col items-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
          >
            <Emoji name={heroEmoji(placement)} size={88} />
          </motion.div>

          <div className="mt-3 flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 font-sans font-semibold text-[15px] tabular-nums">
            <Emoji name="trophy" size={16} />
            {(yourStanding?.finalScore ?? 0).toLocaleString()} pts
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "mt-4 text-center font-display text-[52px] uppercase leading-none tracking-[0.02em]",
              won ? "text-gold-500" : "text-white",
            )}
          >
            {title}
          </motion.h1>
          <p className="mt-2 max-w-xs text-center font-sans text-[15px] text-white/80">
            {subtitle}
          </p>

          {/* podium */}
          <Podium podium={podium} youId={you.id} won={won} />
        </div>

        {/* standings list — the single scroll region */}
        {rest.length > 0 ? (
          <div className="mt-5 flex w-full flex-col lg:min-h-0 lg:flex-1">
            <ScrollArea className="lg:min-h-0 lg:flex-1" tone="white">
              <div className="flex flex-col gap-1.5">
                {rest.map((s) => (
                  <StandingRow key={s.playerId} standing={s} youId={you.id} />
                ))}
              </div>
            </ScrollArea>
            {youInRest && youOutsidePodium && (
              <div className="mt-2 shrink-0 border-white/15 border-t pt-2">
                <StandingRow standing={youInRest} youId={you.id} pinned />
              </div>
            )}
          </div>
        ) : (
          <div className="lg:flex-1" />
        )}

        {/* actions (fixed) */}
        <div className="flex w-full shrink-0 gap-3 pt-6">
          <ActionButton variant="ghost" onClick={() => navigate({ to: "/" })}>
            Leave
          </ActionButton>
          <ActionButton variant="solid" won={won} onClick={() => navigate({ to: "/game/create" })}>
            New Game
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

// ── radial burst backgrounds (win sunburst rays / lose concentric rings) ──────
const Burst = ({ won }: { won: boolean }) => {
  const backgroundImage = won
    ? "repeating-conic-gradient(from 0deg at 50% 38%, rgba(255,255,255,0.07) 0deg 5deg, transparent 5deg 11deg)"
    : "repeating-radial-gradient(circle at 50% 28%, rgba(255,255,255,0.06) 0 26px, transparent 26px 52px)";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage }} />
  );
};

// ── podium (top 3) ───────────────────────────────────────────────────────────
const Podium = ({ podium, youId, won }: { podium: Standing[]; youId: string; won: boolean }) => {
  // arrange as 2nd · 1st · 3rd
  const slots = [
    { pos: "left", s: podium[1] },
    { pos: "center", s: podium[0] },
    { pos: "right", s: podium[2] },
  ];
  const heights = ["h-24", "h-32", "h-20"];
  return (
    <div className="mt-8 flex w-full items-end justify-center gap-2.5">
      {slots.map(({ pos, s }, i) => {
        if (!s) return <div key={pos} className="flex-1" />;
        const isYou = s.playerId === youId;
        return (
          <motion.div
            key={s.playerId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <Emoji name={PODIUM_MEDAL[s.placement] ?? "medalGold"} size={i === 1 ? 32 : 26} />
            <Avatar name={s.nickname} seed={s.playerId} size={i === 1 ? "lg" : "md"} />
            <span className="max-w-full truncate font-sans font-semibold text-[13px] text-white">
              {isYou ? "You" : s.nickname}
            </span>
            <div
              className={cn(
                "flex w-full flex-col items-center justify-start gap-1 rounded-t-xl pt-3",
                heights[i],
                won ? "bg-white/12" : "bg-white/15",
                isYou && "ring-2 ring-white/50",
              )}
            >
              <span className="font-display text-[20px] text-gold-500">{s.placement}</span>
              <span className="font-sans font-semibold text-[13px] text-white/85 tabular-nums">
                {s.finalScore.toLocaleString()}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ── standings row ────────────────────────────────────────────────────────────
const StandingRow = ({
  standing,
  youId,
  pinned,
}: {
  standing: Standing;
  youId: string;
  pinned?: boolean;
}) => {
  const isYou = standing.playerId === youId;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5",
        isYou ? "bg-white/20 ring-1 ring-white/40" : "bg-white/8",
        pinned && "bg-white/25",
      )}
    >
      <span className="w-7 text-center font-sans font-semibold text-[14px] text-white/70 tabular-nums">
        {standing.placement}
      </span>
      <Avatar name={standing.nickname} seed={standing.playerId} size="sm" />
      <span className="flex-1 truncate font-sans font-semibold text-[14px] text-white">
        {isYou ? "You" : standing.nickname}
        {standing.isAi && <span className="ml-1.5 text-[11px] text-white/55">AI</span>}
      </span>
      <span className="font-sans font-semibold text-[14px] text-white tabular-nums">
        {standing.finalScore.toLocaleString()}
      </span>
    </div>
  );
};

// ── action buttons ───────────────────────────────────────────────────────────
const ActionButton = ({
  children,
  onClick,
  variant,
  won,
}: {
  children: string;
  onClick: () => void;
  variant: "solid" | "ghost";
  won?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-14 flex-1 rounded-2xl font-sans font-semibold text-[16px] outline-none cursor-hand transition-[transform,filter] duration-150 active:scale-[0.985]",
      variant === "solid"
        ? cn("bg-white hover:brightness-95", won ? "text-brand-purple-600" : "text-danger-600")
        : "border-2 border-white/40 bg-white/10 text-white hover:bg-white/20",
    )}
  >
    {children}
  </button>
);
