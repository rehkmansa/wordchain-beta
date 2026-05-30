import { cn } from "~/lib/utils";

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  ariaLabel?: string;
  className?: string;
};

// Thick "fat bar" slider: solid purple fill, light-lavender remainder, a square
// value bubble with a white gap. Real (transparent) range input on top for a11y.
export const Slider = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  className,
}: SliderProps) => {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Cap>{min}</Cap>
      <div className="relative h-10 flex-1">
        {/* remaining track */}
        <div className="absolute inset-0 rounded-2xl bg-brand-purple-500/12" />
        {/* filled */}
        <div
          className="absolute inset-y-0 left-0 rounded-2xl bg-linear-to-r from-brand-purple-500 to-brand-purple-600"
          style={{ width: `${pct}%` }}
        />
        {/* value bubble with white gap */}
        <div
          className="pointer-events-none absolute top-1/2 z-10 grid h-12 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-linear-to-b from-brand-purple-500 to-brand-purple-600 font-sans font-semibold text-[18px] text-white shadow-[0_4px_12px_rgba(111,83,253,0.4)] ring-4 ring-white tabular-nums"
          style={{ left: `${pct}%` }}
        >
          {value}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-hand appearance-none bg-transparent opacity-0 outline-none"
        />
      </div>
      <Cap>{max}</Cap>
    </div>
  );
};

const Cap = ({ children }: { children: number }) => (
  <span className="grid h-10 min-w-11 place-items-center rounded-2xl bg-grey-300/20 px-2.5 font-sans font-semibold text-[18px] text-grey-800 tabular-nums">
    {children}
  </span>
);
