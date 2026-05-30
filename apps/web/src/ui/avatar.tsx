import { cn } from "~/lib/utils";

// Deterministic friendly palette so a given player keeps a stable colour.
const PALETTE = [
  "bg-brand-purple-500",
  "bg-amber-500",
  "bg-success-500",
  "bg-brand-purple-700",
  "bg-gold-600",
  "bg-danger-500",
  "bg-brand-purple-400",
];

const hashIndex = (seed: string, mod: number) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";

const SIZES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8 w-8 text-[12px] ring-2",
  md: "h-10 w-10 text-[14px] ring-2",
  lg: "h-12 w-12 text-[16px] ring-[3px]",
};

type AvatarProps = {
  name: string;
  seed?: string;
  size?: "sm" | "md" | "lg";
  connected?: boolean;
  className?: string;
};

export const Avatar = ({ name, seed, size = "md", connected = true, className }: AvatarProps) => (
  <span
    title={name}
    className={cn(
      "inline-grid place-items-center rounded-full font-sans font-semibold text-white ring-white/70 select-none",
      PALETTE[hashIndex(seed ?? name, PALETTE.length)],
      SIZES[size],
      !connected && "opacity-40 grayscale",
      className,
    )}
  >
    {initials(name)}
  </span>
);

type AvatarStackProps = {
  players: Array<{ id: string; nickname: string; connected?: boolean }>;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export const AvatarStack = ({ players, max = 5, size = "md", className }: AvatarStackProps) => {
  const shown = players.slice(0, max);
  const overflow = players.length - shown.length;
  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2.5">
        {shown.map((p) => (
          <Avatar
            key={p.id}
            name={p.nickname}
            seed={p.id}
            size={size}
            connected={p.connected ?? true}
          />
        ))}
      </div>
      {overflow > 0 && (
        <span
          className={cn(
            "ml-2 grid place-items-center rounded-full bg-white/15 px-2 font-sans font-semibold text-white tabular-nums",
            size === "lg"
              ? "h-12 text-[15px]"
              : size === "md"
                ? "h-10 text-[14px]"
                : "h-8 text-[12px]",
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
};
