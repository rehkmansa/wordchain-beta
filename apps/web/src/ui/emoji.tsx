import { cn } from "~/lib/utils";

// Self-hosted Apple 3D emoji (subset extracted from emoji-datasource-apple → public/emoji).
// Named so call-sites read intent, and the asset files share those readable names.
const EMOJI = {
  trophy: { file: "trophy", label: "Trophy" },
  medalGold: { file: "medal-gold", label: "1st place medal" },
  medalSilver: { file: "medal-silver", label: "2nd place medal" },
  medalBronze: { file: "medal-bronze", label: "3rd place medal" },
  fire: { file: "fire", label: "Fire" },
  sad: { file: "sad", label: "Pensive face" },
  bang: { file: "bang", label: "Exclamation" },
  heartBroken: { file: "heart-broken", label: "Broken heart" },
  heart: { file: "heart", label: "Heart" },
  heartWhite: { file: "heart-white", label: "White heart" },
  dash: { file: "dash", label: "Dash" },
  party: { file: "party", label: "Party popper" },
} as const;

export type EmojiName = keyof typeof EMOJI;

type EmojiProps = {
  name: EmojiName;
  size?: number;
  className?: string;
};

export const Emoji = ({ name, size = 24, className }: EmojiProps) => {
  const { file, label } = EMOJI[name];
  return (
    <img
      src={`/emoji/${file}.png`}
      alt={label}
      width={size}
      height={size}
      draggable={false}
      className={cn("inline-block select-none object-contain align-[-0.15em]", className)}
      style={{ width: size, height: size }}
    />
  );
};
