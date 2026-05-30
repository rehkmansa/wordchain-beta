import { motion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "~/lib/utils";

const COLORS = [
  "bg-amber-500",
  "bg-brand-purple-400",
  "bg-success-500",
  "bg-danger-500",
  "bg-white",
];

// Full-screen particle burst — token-colored squares falling with drift + spin.
export const Confetti = ({ count = 90 }: { count?: number }) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        drift: (Math.random() - 0.5) * 28,
        delay: Math.random() * 0.5,
        duration: 2.4 + Math.random() * 1.8,
        spin: (Math.random() - 0.5) * 720,
        size: 6 + Math.round(Math.random() * 6),
        color: COLORS[i % COLORS.length],
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={cn("absolute top-0 rounded-[2px]", p.color)}
          style={{ left: `${p.x}vw`, width: p.size, height: p.size }}
          initial={{ y: "-10vh", rotate: 0, opacity: 1 }}
          animate={{ y: "110vh", x: `${p.drift}vw`, rotate: p.spin, opacity: [1, 1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
};
