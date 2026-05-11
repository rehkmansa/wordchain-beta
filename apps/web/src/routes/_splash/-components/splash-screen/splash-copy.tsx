import { motion } from "framer-motion";
import { Fragment, useMemo } from "react";

const HEADING = "How many words can you find?";
const PARAGRAPH = "Relax, explore, and enjoy simple word puzzles at your own pace.";

const HEADING_START = 0.15;
const PARAGRAPH_START = 0.15;
const WORD_STAGGER = 0.035;
const ARRANGE_DURATION = 0.75;
const BLUR_DURATION = 0.4;
const SCATTER_X = 90;
const SCATTER_Y = 70;
const SCATTER_Y_JITTER = 40;
const SCATTER_ROTATE = 25;
const BLUR_AMOUNT = 10;

type ScatteredWord = {
  word: string;
  index: number;
  charOffset: number;
  scatterX: number;
  scatterRotate: number;
  scatterY: number;
};

const scatterWords = (text: string): ScatteredWord[] => {
  let charOffset = 0;
  return text.split(" ").map((word, index) => {
    const entry: ScatteredWord = {
      word,
      index,
      charOffset,
      scatterX: (Math.random() - 0.5) * 2 * SCATTER_X,
      scatterRotate: (Math.random() - 0.5) * SCATTER_ROTATE,
      scatterY: SCATTER_Y + Math.random() * SCATTER_Y_JITTER,
    };
    charOffset += word.length + 1;
    return entry;
  });
};

type AnimatedWordsProps = {
  text: string;
  startDelay: number;
  keyPrefix: string;
};

const AnimatedWords = ({ text, startDelay, keyPrefix }: AnimatedWordsProps) => {
  const words = useMemo(() => scatterWords(text), [text]);
  const lastIndex = words.length - 1;
  const blurStart = startDelay + lastIndex * WORD_STAGGER + ARRANGE_DURATION;

  return (
    <>
      {words.map(({ word, index, charOffset, scatterX, scatterRotate, scatterY }) => {
        const wordDelay = startDelay + index * WORD_STAGGER;
        return (
          <Fragment key={`${keyPrefix}-${word}-${charOffset}`}>
            <motion.span
              className="inline-block whitespace-pre will-change-transform"
              initial={{
                x: scatterX,
                y: scatterY,
                rotate: scatterRotate,
                opacity: 0,
                filter: `blur(${BLUR_AMOUNT}px)`,
              }}
              animate={{
                x: 0,
                y: 0,
                rotate: 0,
                opacity: 1,
                filter: "blur(0px)",
              }}
              transition={{
                x: {
                  delay: wordDelay,
                  duration: ARRANGE_DURATION,
                  ease: [0.22, 1, 0.36, 1],
                },
                y: {
                  delay: wordDelay,
                  duration: ARRANGE_DURATION,
                  ease: [0.22, 1, 0.36, 1],
                },
                rotate: {
                  delay: wordDelay,
                  duration: ARRANGE_DURATION,
                  ease: [0.22, 1, 0.36, 1],
                },
                opacity: {
                  delay: wordDelay,
                  duration: 0.35,
                  ease: "easeOut",
                },
                filter: {
                  delay: blurStart,
                  duration: BLUR_DURATION,
                  ease: "easeOut",
                },
              }}
            >
              {word}
              {index < lastIndex ? " " : ""}
            </motion.span>
          </Fragment>
        );
      })}
    </>
  );
};

export const SplashCopy = () => (
  <div className="flex flex-col gap-4 text-white">
    <h2 className="text-[40px] leading-12 font-semibold tracking-[-0.02em]">
      <AnimatedWords text={HEADING} startDelay={HEADING_START} keyPrefix="h" />
    </h2>
    <p className="text-[28px] leading-8.5 font-normal tracking-[-0.02em]">
      <AnimatedWords text={PARAGRAPH} startDelay={PARAGRAPH_START} keyPrefix="p" />
    </p>
  </div>
);
