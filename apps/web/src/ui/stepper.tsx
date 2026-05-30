import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import { MinusIcon, PlusIcon } from "./icons";

type StepperProps = {
  value: ReactNode;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement?: boolean;
  canIncrement?: boolean;
  ariaLabel?: string;
  className?: string;
};

const StepBtn = ({
  children,
  onClick,
  disabled,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={cn(
      "grid h-14 w-14 shrink-0 place-items-center rounded-2xl outline-none cursor-hand",
      "bg-linear-to-b from-brand-purple-500 to-brand-purple-600 text-white",
      "transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.94]",
      "focus-visible:ring-2 focus-visible:ring-brand-purple-500/50",
      "disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100",
    )}
  >
    {children}
  </button>
);

export const Stepper = ({
  value,
  onDecrement,
  onIncrement,
  canDecrement = true,
  canIncrement = true,
  ariaLabel,
  className,
}: StepperProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <StepBtn onClick={onDecrement} disabled={!canDecrement} label={`Decrease ${ariaLabel ?? ""}`}>
      <MinusIcon size={26} variant="Linear" />
    </StepBtn>
    <div
      aria-live="polite"
      className="grid h-14 min-w-32 flex-1 place-items-center rounded-2xl bg-grey-300/20 px-4 font-sans font-semibold text-grey-800 tabular-nums text-[22px]"
    >
      {value}
    </div>
    <StepBtn onClick={onIncrement} disabled={!canIncrement} label="Increase">
      <PlusIcon size={26} variant="Linear" />
    </StepBtn>
  </div>
);
