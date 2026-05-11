import { LetterRow } from "../letter-row";
import { QuestionMarkIcon } from "./assets/question-mark";
import { SplashCopy } from "./splash-copy";

export const SplashScreen = () => (
  <div className="relative h-full w-full overflow-hidden bg-linear-to-b from-brand-purple-500 to-brand-purple-600 shadow-[0_4px_4px_rgba(0,0,0,0.25)] grid place-items-center">
    <div className="grid place-items-center gap-35">
      <div className="">
        <QuestionMarkIcon />
      </div>

      <LetterRow />
    </div>
    <div className="max-w-145 mx-auto">
      <SplashCopy />
    </div>
  </div>
);
