import { QuestionMarkIcon } from "./assets/question-mark";
import { SplashCopy } from "./splash-copy";

export const SplashScreen = () => {
  return (
    <div className="relative h-full w-full overflow-hidden bg-linear-to-b from-brand-purple-500 to-brand-purple-600 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
      <div className="absolute inset-0 flex items-center justify-center">
        <QuestionMarkIcon />
      </div>

      <div className="absolute bottom-[80px] left-[80px] right-[80px]">
        <SplashCopy />
      </div>
    </div>
  );
};
