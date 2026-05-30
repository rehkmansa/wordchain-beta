import { cn } from "~/lib/utils";
import { TimerIcon } from "./icons";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Zone = "calm" | "warn" | "danger";
const zoneOf = (pct: number): Zone => (pct > 0.5 ? "calm" : pct > 0.2 ? "warn" : "danger");

const FILL: Record<Zone, string> = {
  calm: "bg-linear-to-r from-brand-purple-400 to-brand-purple-500",
  warn: "bg-linear-to-r from-amber-500 to-amber-600",
  danger: "bg-linear-to-r from-danger-500 to-danger-600",
};
const TEXT: Record<Zone, string> = {
  calm: "text-white",
  warn: "text-amber-600",
  danger: "text-danger-500",
};
const STROKE: Record<Zone, string> = {
  calm: "stroke-brand-purple-500",
  warn: "stroke-amber-500",
  danger: "stroke-danger-500",
};

type CommonProps = {
  remaining: number;
  total: number;
  paused?: boolean;
  className?: string;
};

export const CountdownBar = ({ remaining, total, paused, className }: CommonProps) => {
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const zone = zoneOf(pct);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TimerIcon
        size={20}
        className={cn("shrink-0", paused ? "text-white/50" : TEXT[zone])}
        variant="Bold"
      />
      <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-white/12">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-200 ease-linear",
            paused ? "bg-white/30" : FILL[zone],
            zone === "danger" && !paused && "animate-pulse",
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span
        className={cn(
          "w-12 text-right font-sans font-semibold tabular-nums text-[16px]",
          paused ? "text-white/50" : TEXT[zone],
        )}
      >
        {fmt(remaining)}
      </span>
    </div>
  );
};

export const CountdownRing = ({ remaining, total, paused, className }: CommonProps) => {
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const zone = zoneOf(pct);
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative grid h-16 w-16 place-items-center", className)}>
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label="Time remaining"
        className={cn("h-16 w-16 -rotate-90", zone === "danger" && !paused && "animate-pulse")}
      >
        <title>Time remaining</title>
        <circle cx="32" cy="32" r={r} className="fill-none stroke-white/12" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          strokeWidth="6"
          strokeLinecap="round"
          className={cn(
            "fill-none transition-[stroke-dashoffset] duration-200 ease-linear",
            paused ? "stroke-white/30" : STROKE[zone],
          )}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span
        className={cn(
          "absolute font-sans font-semibold tabular-nums text-[14px]",
          paused ? "text-white/50" : TEXT[zone],
        )}
      >
        {fmt(remaining)}
      </span>
    </div>
  );
};
