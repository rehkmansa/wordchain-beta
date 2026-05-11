import { AnimatePresence, motion } from "framer-motion";

type LetterTileProps = {
  letter: string;
  isLifted: boolean;
};

export const LetterTile = ({ letter, isLifted }: LetterTileProps) => {
  return (
    <div className="relative h-20 w-20">
      <div
        className={
          isLifted
            ? "h-full w-full rounded-xl border border-dashed border-white bg-white/5"
            : "h-full w-full rounded-xl bg-white/8 flex items-center justify-center text-2xl text-white"
        }
      >
        {!isLifted && letter}
      </div>

      <AnimatePresence>
        {isLifted && (
          <motion.div
            key="lifted"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: -92, opacity: 1 }}
            exit={{
              y: -50,
              opacity: 0,
              transition: { type: "tween", duration: 0.12, ease: "easeOut" },
            }}
            transition={{ type: "spring", stiffness: 150, damping: 20, mass: 1 }}
            className="absolute inset-0"
          >
            <svg
              width="79"
              height="79"
              viewBox="0 0 79 79"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[0_12px_18px_rgba(0,0,0,0.2)]"
            >
              <title>{letter}</title>
              <path
                d="M0 8.46429C0 3.78959 3.78959 0 8.46429 0H65.2622C67.2986 0 69.2668 0.734193 70.8057 2.06792L76.0792 6.63831C77.9343 8.24603 79 10.5799 79 13.0347V70.5357C79 75.2104 75.2104 79 70.5357 79H11.2214C8.59349 79 6.11466 77.7794 4.5124 75.6965L1.75529 72.1122C0.617112 70.6326 0 68.8182 0 66.9515V8.46429Z"
                fill="white"
              />
              <rect
                x="1.41072"
                y="1.41064"
                width="67.7143"
                height="67.7143"
                rx="5.64286"
                fill="#8156FD"
              />
              <text
                x="35.27"
                y="35.27"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontFamily="Fredoka, sans-serif"
                fontSize="24"
              >
                {letter}
              </text>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
