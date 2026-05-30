import { useMuted } from "~/lib/audio/use-sfx";
import { Badge } from "~/ui/badge";
import { Emoji } from "~/ui/emoji";
import { BackIcon, MuteIcon, PeopleIcon, SoundIcon } from "~/ui/icons";

export const TopBar = ({
  roundNumber,
  totalRounds,
  opponentCount,
  score,
  onBack,
}: {
  roundNumber: number;
  totalRounds: number;
  opponentCount: number;
  score: number;
  onBack: () => void;
}) => {
  const { muted, toggle } = useMuted();
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 rounded-full py-1.5 pr-3 pl-1.5 font-sans font-semibold text-[15px] text-white/90 outline-none cursor-hand hover:bg-white/10"
      >
        <BackIcon size={22} variant="Linear" />
        <span className="hidden sm:inline">Leave</span>
      </button>

      <div className="flex flex-col items-center leading-tight">
        <span className="font-display text-[16px] uppercase tracking-[0.12em] text-white/70">
          Word Chains
        </span>
        <span className="font-sans font-semibold text-[13px] text-white/55 tabular-nums">
          Round {roundNumber}/{totalRounds}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          className="grid h-9 w-9 place-items-center rounded-full text-white/70 outline-none cursor-hand hover:bg-white/10"
        >
          {muted ? (
            <MuteIcon size={18} variant="Linear" />
          ) : (
            <SoundIcon size={18} variant="Linear" />
          )}
        </button>
        <Badge tone="translucent" icon={<PeopleIcon size={15} variant="Bold" />}>
          {opponentCount}
        </Badge>
        <Badge tone="translucent" icon={<Emoji name="trophy" size={14} />}>
          {score.toLocaleString()}
        </Badge>
      </div>
    </header>
  );
};
