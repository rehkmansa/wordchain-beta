import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import cursorHand from "~/assets/cursor-hand.svg";
import { LetterTile } from "./letter-tile";

const LETTERS = [
  { id: "c", letter: "C" },
  { id: "l", letter: "L" },
  { id: "a", letter: "A" },
  { id: "s1", letter: "S" },
  { id: "s2", letter: "S" },
];

const TILE_SIZE = 80;
const GAP = 38;
const HOLD_MS = 1800;
const HOLD_JITTER_MS = 600;
const TRAVEL_MS = 600;
const TRAVEL_JITTER_MS = 150;

const CURSOR_X_OFFSET = TILE_SIZE - 22;
const CURSOR_Y_UP = -28;
const CURSOR_Y_DOWN = 32;

type Phase = "up" | "travel";

const jitter = (base: number, spread: number) => base + (Math.random() - 0.5) * spread;

const tileX = (i: number) => i * (TILE_SIZE + GAP) + CURSOR_X_OFFSET;

export const LetterRow = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("up");
  const travelDuration = useRef(TRAVEL_MS);

  useEffect(() => {
    if (phase === "up") {
      const t = setTimeout(() => setPhase("travel"), jitter(HOLD_MS, HOLD_JITTER_MS));
      return () => clearTimeout(t);
    }
    travelDuration.current = jitter(TRAVEL_MS, TRAVEL_JITTER_MS);
    const t = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % LETTERS.length);
      setPhase("up");
    }, travelDuration.current);
    return () => clearTimeout(t);
  }, [phase]);

  const nextIndex = (activeIndex + 1) % LETTERS.length;
  const fromX = tileX(activeIndex);
  const toX = tileX(nextIndex);

  const animate = phase === "up" ? { x: fromX, y: CURSOR_Y_UP } : { x: toX, y: CURSOR_Y_DOWN };

  const transition =
    phase === "up"
      ? { type: "spring" as const, stiffness: 120, damping: 20, mass: 1 }
      : {
          duration: travelDuration.current / 1000,
          ease: [0.45, 0, 0.55, 1] as [number, number, number, number],
        };

  return (
    <div className="relative flex gap-9.5">
      {LETTERS.map(({ id, letter }, i) => (
        <LetterTile key={id} letter={letter} isLifted={phase === "up" && i === activeIndex} />
      ))}
      <motion.img
        src={cursorHand}
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-9.5 w-9.5"
        animate={animate}
        transition={transition}
      />
    </div>
  );
};
