import { motion } from "framer-motion";
import { cn } from "~/lib/utils";

type TileVariant = "visible" | "blank" | "typed" | "hint" | "correct" | "wrong";

type WordTileProps = {
  char?: string;
  variant: TileVariant;
  size?: "sm" | "md" | "lg";
  /** flip-reveal when a hidden tile resolves to a char */
  reveal?: boolean;
  delay?: number;
  className?: string;
};

const SIZES: Record<NonNullable<WordTileProps["size"]>, string> = {
  sm: "h-9 w-8 text-[18px] rounded-md",
  md: "h-12 w-10 text-[22px] rounded-lg",
  lg: "h-16 w-13 text-[30px] rounded-xl",
};

const VARIANTS: Record<TileVariant, string> = {
  visible: "bg-white/10 text-white",
  blank: "border-2 border-dashed border-amber-500/80 bg-amber-500/5 text-transparent",
  typed: "border-2 border-amber-500 bg-amber-500/15 text-amber-500",
  hint: "bg-amber-500 text-white shadow-[0_4px_12px_rgba(249,160,63,0.45)]",
  correct: "bg-success-500 text-white shadow-[0_4px_12px_rgba(54,207,139,0.45)]",
  wrong: "bg-danger-500/90 text-white shadow-[0_4px_12px_rgba(251,93,93,0.4)]",
};

export const WordTile = ({
  char,
  variant,
  size = "lg",
  reveal,
  delay = 0,
  className,
}: WordTileProps) => {
  const content = (
    <span className="font-sans font-semibold uppercase leading-none">{char ?? ""}</span>
  );
  const base = cn("grid place-items-center select-none", SIZES[size], VARIANTS[variant], className);

  if (reveal) {
    return (
      <motion.div
        initial={{ rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay }}
        className={base}
      >
        {content}
      </motion.div>
    );
  }

  return <div className={base}>{content}</div>;
};
