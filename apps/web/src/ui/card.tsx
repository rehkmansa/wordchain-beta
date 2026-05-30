import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "~/lib/utils";

type Variant = "solid" | "panel" | "panel-strong";

type CardProps = {
  children: ReactNode;
  variant?: Variant;
} & HTMLAttributes<HTMLDivElement>;

// solid        — white surface on light backgrounds (forms, feed card)
// panel        — translucent layer over the purple play background
// panel-strong — a slightly brighter translucent layer (nested panels)
const VARIANTS: Record<Variant, string> = {
  solid: "bg-white shadow-[0_8px_30px_rgba(31,18,77,0.08)]",
  panel: "bg-white/8 backdrop-blur-sm",
  "panel-strong": "bg-white/12 backdrop-blur-sm",
};

export const Card = ({ children, variant = "solid", className, ...rest }: CardProps) => (
  <div className={cn("rounded-2xl", VARIANTS[variant], className)} {...rest}>
    {children}
  </div>
);
