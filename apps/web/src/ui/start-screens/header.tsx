import { cn } from "~/lib/utils";

type Variant = "gold" | "purple";

type LogoWordProps = {
  text: string;
  size: number;
  lineHeight: number;
  variant: Variant;
};

const VARIANT_STYLES: Record<Variant, { solid: string; gradient: string }> = {
  gold: {
    solid: "text-logo-gold",
    gradient:
      "linear-gradient(180deg, var(--color-logo-gold-grad-from) 20%, var(--color-logo-gold-grad-to) 100%)",
  },
  purple: {
    solid: "text-logo-purple",
    gradient:
      "linear-gradient(180deg, var(--color-logo-purple-grad-from) 49.03%, var(--color-logo-purple-grad-to) 100%)",
  },
};

const LogoWord = ({ text, size, lineHeight, variant }: LogoWordProps) => {
  const { solid, gradient } = VARIANT_STYLES[variant];
  const fontStyle = {
    fontFamily: "var(--font-display)",
    fontSize: size,
    lineHeight: `${lineHeight}px`,
    letterSpacing: "0.04em",
    fontWeight: 500,
  } as const;

  return (
    <div className="relative inline-block" style={{ ...fontStyle, height: lineHeight + 8 }}>
      <span className="invisible uppercase">{text}</span>
      <span
        className="absolute inset-x-0 top-2 text-center uppercase text-transparent bg-clip-text"
        style={{ ...fontStyle, backgroundImage: gradient }}
      >
        {text}
      </span>
      <span
        className={cn("absolute inset-x-0 top-0 text-center uppercase", solid)}
        style={fontStyle}
      >
        {text}
      </span>
    </div>
  );
};

type StartScreenHeaderProps = {
  title: string;
  desc: string;
};

export const StartScreenHeader = ({ title, desc }: StartScreenHeaderProps) => {
  const [top = "", bottom = ""] = title.trim().split(/\s+/);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center">
        <LogoWord text={top} size={70} lineHeight={75} variant="gold" />
        <div className="-mt-8">
          <LogoWord text={bottom} size={96} lineHeight={103} variant="purple" />
        </div>
      </div>
      <p className="text-center font-normal text-grey-400 text-[18px]/5.5 tracking-[-0.02em]">
        {desc}
      </p>
    </div>
  );
};
