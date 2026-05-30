import { cn } from "~/lib/utils";

type RoomCodeProps = {
  code: string;
  variant?: "boxes" | "panel";
  className?: string;
};

// boxes — discrete tiles on a light surface (join confirm)
// panel — single translucent panel with tracked letters, over the purple bg (lobby)
export const RoomCode = ({ code, variant = "boxes", className }: RoomCodeProps) => {
  if (variant === "panel") {
    return (
      <div
        role="img"
        aria-label={`Room code ${code}`}
        className={cn(
          "grid place-items-center rounded-2xl border-2 border-white/40 bg-white/10 py-6 font-sans font-semibold text-white text-[32px] tracking-[0.4em] uppercase tabular-nums",
          className,
        )}
      >
        {code}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Room code ${code}`}
      className={cn("flex justify-center gap-2", className)}
    >
      {code.split("").map((ch, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: positional code chars, index is the identity
          key={i}
          className="grid h-13 w-11 place-items-center rounded-xl border-2 border-brand-purple-500/25 bg-brand-purple-500/8 font-sans font-semibold uppercase text-brand-purple-600 text-[24px] tabular-nums"
        >
          {ch}
        </span>
      ))}
    </div>
  );
};
