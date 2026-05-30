import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

type Tab<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedTabsProps<T extends string> = {
  tabs: Array<Tab<T>>;
  value: T;
  onChange: (value: T) => void;
  layoutId?: string;
  className?: string;
};

export const SegmentedTabs = <T extends string>({
  tabs,
  value,
  onChange,
  layoutId = "segmented-tabs",
  className,
}: SegmentedTabsProps<T>) => (
  <div role="tablist" className={cn("flex gap-1 rounded-full bg-grey-300/15 p-1", className)}>
    {tabs.map((tab) => {
      const active = tab.value === value;
      return (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative flex h-11 flex-1 items-center justify-center gap-2 rounded-full outline-none cursor-hand",
            "font-sans font-semibold text-[15px] tracking-[-0.01em] transition-colors duration-200",
            "focus-visible:ring-2 focus-visible:ring-brand-purple-500/40",
            active ? "text-brand-purple-600" : "text-grey-400 hover:text-grey-500",
          )}
        >
          {active && (
            <motion.span
              layoutId={layoutId}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-full bg-white shadow-[0_4px_14px_rgba(31,18,77,0.1)]"
            />
          )}
          <span className="relative flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      );
    })}
  </div>
);
