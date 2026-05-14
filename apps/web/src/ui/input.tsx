import type { InputHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, type = "text", ...rest }: InputProps) => {
  return (
    <input
      type={type}
      className={cn(
        "h-16 w-full rounded-2xl border border-grey-300 bg-white px-5 text-center font-sans font-semibold text-grey-800 tracking-[-0.02em] text-[18px] leading-5.5",
        "placeholder:font-semibold placeholder:text-grey-300",
        "outline-none transition-colors duration-150 focus:border-brand-purple-500",
        className,
      )}
      {...rest}
    />
  );
};
