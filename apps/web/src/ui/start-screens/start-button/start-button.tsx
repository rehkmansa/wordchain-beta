import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "~/lib/utils";

type Accent = "purple" | "gold";

type StartButtonProps = {
  children: ReactNode;
  accent: Accent;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const ACCENT_CLASSES: Record<Accent, { border: string; gradient: string }> = {
  purple: {
    border: "border-brand-purple-500",
    gradient: "from-brand-purple-500 to-brand-purple-600",
  },
  gold: {
    border: "border-brand-yellow-500",
    gradient: "from-logo-gold-grad-to to-logo-gold-grad-from",
  },
};

export const StartButton = ({
  children,
  accent,
  className = "",
  type = "button",
  ...rest
}: StartButtonProps) => {
  const { border, gradient } = ACCENT_CLASSES[accent];

  return (
    <button
      type={type}
      className={cn("group flex h-20 w-full items-start outline-none cursor-hand", className)}
      {...rest}
    >
      <div
        className={cn(
          "relative w-full rounded-2xl bg-linear-to-b pb-1 transition-[padding] duration-200 ease-out group-hover:pb-4 group-active:pb-1 group-disabled:pb-1",
          gradient,
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center justify-center rounded-2xl border bg-white",
            border,
          )}
        >
          <span className="font-sans font-semibold uppercase text-grey-800 text-[18px] leading-5.5 tracking-[-0.02em]">
            {children}
          </span>
        </div>
      </div>
    </button>
  );
};
