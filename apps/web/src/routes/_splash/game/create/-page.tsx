import type { GameSettings } from "@repo/shared";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ensureAnonSession } from "~/lib/api/auth";
import { ApiError } from "~/lib/api/client";
import { createRoom } from "~/lib/api/rooms";
import { RULES } from "~/lib/constants";
import { Button } from "~/ui/button";
import { Emoji } from "~/ui/emoji";
import { Slider } from "~/ui/slider";
import { StartScreenHeader } from "~/ui/start-screens/header";
import { Stepper } from "~/ui/stepper";
import { Toggle } from "~/ui/toggle";

const PRESETS = RULES.ROUND_TIME_PRESETS;

// figma-style two-cell display (minutes | seconds)
const TimeValue = ({ ms }: { ms: number }) => {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <span className="flex items-stretch divide-x divide-grey-300/60">
      <span className="grid place-items-center px-5">{m} m</span>
      <span className="grid place-items-center px-5">{s} s</span>
    </span>
  );
};

const Label = ({ children }: { children: string }) => (
  <span className="text-center font-sans font-medium text-[15px] text-grey-400 tracking-[-0.01em]">
    {children}
  </span>
);

const CREATE_ERROR: Record<string, string> = {
  TOO_MANY_ROOMS: "You already have an active room. Close it before making another.",
  RATE_LIMITED: "Slow down a moment — too many rooms created. Try again shortly.",
  INVALID_SETTINGS: "Those settings aren't valid. Adjust and try again.",
};

export const Page = () => {
  const navigate = useNavigate();
  const [chainLength, setChainLength] = useState<number>(RULES.CHAIN_DEFAULT);
  const [timeIndex, setTimeIndex] = useState(1); // default 15s
  const [elimination, setElimination] = useState(false);
  const [lives, setLives] = useState<number>(RULES.LIVES_DEFAULT);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roundTimeMs = PRESETS[timeIndex] ?? 15_000;

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    const settings: GameSettings = {
      chainLength,
      roundTimeMs,
      elimination,
      ...(elimination ? { lives } : {}),
    };
    try {
      await ensureAnonSession();
      const { roomCode, gameId } = await createRoom("group", settings);
      sessionStorage.setItem(`wc:game:${roomCode}`, gameId);
      navigate({ to: "/game/$roomId/lobby", params: { roomId: roomCode } });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "INTERNAL";
      setError(CREATE_ERROR[code] ?? "Couldn't create the room. Please try again.");
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-4 pt-16 pb-16 sm:px-12 lg:max-h-screen lg:overflow-y-auto lg:fancy-scroll">
      <div className="mb-9 max-w-100">
        <StartScreenHeader title="Create Game" desc="Set the rules, then invite your friends." />
      </div>

      <div className="flex w-full max-w-md flex-col gap-8">
        {/* chain length */}
        <div className="flex flex-col gap-3">
          <Label>Chain Length</Label>
          <Slider
            value={chainLength}
            min={RULES.CHAIN_MIN}
            max={RULES.CHAIN_MAX}
            onChange={setChainLength}
            ariaLabel="Chain length"
          />
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-sans text-[14px] text-grey-400 tabular-nums">{chainLength}</span>
            <span className="font-sans font-semibold text-[16px] text-grey-800">Word pairs</span>
          </div>
        </div>

        {/* round timer */}
        <div className="flex flex-col gap-3">
          <Label>Turn time</Label>
          <div className="flex justify-center">
            <Stepper
              ariaLabel="Round timer"
              value={<TimeValue ms={roundTimeMs} />}
              onDecrement={() => setTimeIndex((i) => Math.max(0, i - 1))}
              onIncrement={() => setTimeIndex((i) => Math.min(PRESETS.length - 1, i + 1))}
              canDecrement={timeIndex > 0}
              canIncrement={timeIndex < PRESETS.length - 1}
            />
          </div>
          <Label>Per turn</Label>
        </div>

        {/* elimination */}
        <div className="flex flex-col gap-4 rounded-2xl border border-grey-300/60 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-sans font-semibold text-grey-700 text-[15px]">Elimination</span>
              <span className="font-sans text-grey-400 text-[13px]">
                Run out of lives and you're out
              </span>
            </div>
            <Toggle checked={elimination} onChange={setElimination} label="Elimination" />
          </div>

          {elimination && (
            <div className="flex items-center justify-between border-grey-300/50 border-t pt-4">
              <span className="flex items-center gap-2 font-sans font-semibold text-grey-700 text-[15px]">
                <Emoji name="heart" size={18} /> Lives
              </span>
              <Stepper
                ariaLabel="Lives"
                className="w-auto"
                value={lives}
                onDecrement={() => setLives((n) => Math.max(RULES.LIVES_MIN, n - 1))}
                onIncrement={() => setLives((n) => Math.min(RULES.LIVES_MAX, n + 1))}
                canDecrement={lives > RULES.LIVES_MIN}
                canIncrement={lives < RULES.LIVES_MAX}
              />
            </div>
          )}
        </div>

        {error && (
          <p className="-mt-2 text-center font-sans font-medium text-[14px] text-danger-500">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/" })}>
            Back
          </Button>
          <Button className="flex-[1.6]" disabled={creating} onClick={() => void handleCreate()}>
            {creating ? "Creating…" : "Create Room"}
          </Button>
        </div>
      </div>
    </div>
  );
};
