import { cn } from "~/lib/utils";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
};

export const Toggle = ({ checked, onChange, label, id, disabled }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full outline-none cursor-hand",
      "transition-colors duration-200 ease-out",
      "focus-visible:ring-2 focus-visible:ring-brand-purple-500/50 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-40",
      checked ? "bg-brand-purple-500" : "bg-grey-300/45",
    )}
  >
    <span
      className={cn(
        "inline-block h-6 w-6 rounded-full bg-white shadow-sm",
        "transition-transform duration-200 ease-out",
        checked ? "translate-x-7" : "translate-x-1",
      )}
    />
  </button>
);
