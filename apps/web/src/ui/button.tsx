import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "~/lib/utils";

type Variant = "primary" | "outline";

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export const Button = ({
  children,
  variant = "primary",
  className,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "group relative h-16 w-full overflow-hidden rounded-2xl font-sans font-semibold tracking-[-0.02em] outline-none cursor-hand text-[18px] leading-5.5",
        "transition-[transform,filter,background-color] duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 disabled:hover:brightness-100",
        "active:scale-[0.985]",
        variant === "primary" &&
          "bg-linear-to-b from-brand-purple-500 to-brand-purple-600 text-white hover:brightness-110 active:brightness-95",
        variant === "outline" &&
          "border-2 border-brand-purple-500 bg-white text-brand-purple-600 hover:bg-brand-purple-500/5 active:bg-brand-purple-500/10",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1/2 opacity-0 transition-opacity duration-200",
          "group-active:opacity-100 group-disabled:hidden",
          variant === "primary" && "bg-linear-to-b from-white/40 to-transparent",
          variant === "outline" && "bg-linear-to-b from-brand-purple-500/15 to-transparent",
        )}
      />
      <span className="relative">{children}</span>
    </button>
  );
};
