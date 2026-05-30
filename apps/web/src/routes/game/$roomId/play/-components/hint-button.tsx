import { cn } from "~/lib/utils";
import { HintIcon } from "~/ui/icons";

type HintButtonProps = {
  cost: number;
  remaining: number; // maxHints − used
  cooldownRemainingMs: number;
  gatedReason: "INSUFFICIENT_POINTS" | "HINTS_EXHAUSTED" | null;
  onClick: () => void;
  disabled?: boolean;
};

export const HintButton = ({
  cost,
  remaining,
  cooldownRemainingMs,
  gatedReason,
  onClick,
  disabled,
}: HintButtonProps) => {
  const cooling = cooldownRemainingMs > 0;
  const exhausted = gatedReason === "HINTS_EXHAUSTED" || remaining <= 0;
  const broke = gatedReason === "INSUFFICIENT_POINTS";
  const isDisabled = disabled || cooling || exhausted || broke;

  const label = exhausted
    ? "No hints left"
    : broke
      ? "Need 100 pts"
      : cooling
        ? `Cooling ${(cooldownRemainingMs / 1000).toFixed(1)}s`
        : "Hint";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl font-sans font-semibold text-[15px] text-white outline-none cursor-hand transition-[transform,filter] duration-150",
        "bg-linear-to-b from-amber-500 to-amber-600 shadow-[0_6px_18px_rgba(249,160,63,0.45)]",
        "hover:enabled:brightness-105 active:enabled:scale-[0.985]",
        "disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/10 disabled:text-white/45 disabled:shadow-none",
      )}
    >
      <HintIcon size={20} variant="Bold" />
      <span>{label}</span>
      {!exhausted && !broke && !cooling && (
        <span className="flex items-center gap-1.5 text-[13px] text-white/75">
          <span className="h-1 w-1 rounded-full bg-current" />
          {cost} · {remaining} left
        </span>
      )}
    </button>
  );
};
