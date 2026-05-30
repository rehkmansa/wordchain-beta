import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

type Tone = "purple" | "gold" | "success" | "danger" | "neutral" | "translucent";
type Size = "sm" | "md";

type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  size?: Size;
  icon?: ReactNode;
  className?: string;
};

const TONES: Record<Tone, string> = {
  purple: "bg-brand-purple-500/12 text-brand-purple-600",
  gold: "bg-gold-500/20 text-gold-600",
  success: "bg-success-500/15 text-success-700",
  danger: "bg-danger-500/15 text-danger-600",
  neutral: "bg-grey-300/15 text-grey-500",
  translucent: "bg-white/15 text-white",
};

const SIZES: Record<Size, string> = {
  sm: "h-6 gap-1 px-2.5 text-[12px]",
  md: "h-8 gap-1.5 px-3.5 text-[14px]",
};

export const Badge = ({ children, tone = "neutral", size = "md", icon, className }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full font-sans font-semibold tracking-[-0.01em] tabular-nums",
      TONES[tone],
      SIZES[size],
      className,
    )}
  >
    {icon}
    {children}
  </span>
);
