import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/ui/button";
import { Input } from "~/ui/input";
import { StartScreenHeader } from "~/ui/start-screens/header";
import { StartButton } from "./-components/start-button";

type Mode = "default" | "join";

export const Page = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("default");
  const [code, setCode] = useState("");

  const isJoin = mode === "join";
  const title = isJoin ? "Join Game" : "Word Chains";
  const description = isJoin
    ? "Join a game by entering the code below"
    : "Relax, explore, and enjoy simple word puzzles at your own pace.";

  const trimmedCode = code.trim();

  const handleJoin = () => {
    if (!trimmedCode) return;
    navigate({ to: "/game/$roomId/lobby", params: { roomId: trimmedCode } });
  };

  return (
    <div className="flex flex-col items-center px-12 pt-25">
      <div className="mb-10 max-w-100">
        <StartScreenHeader title={title} desc={description} />
      </div>

      {isJoin ? (
        <div className="flex w-full max-w-md flex-col gap-8">
          <div className="flex flex-col gap-3">
            <label
              htmlFor="room-code"
              className="text-center font-normal text-grey-400 tracking-[-0.02em] text-[18px] leading-5.5"
            >
              Enter Code
            </label>
            <Input
              id="room-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="122-000"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-4">
            <Button onClick={handleJoin} disabled={!trimmedCode}>
              Join Room
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode("default");
                setCode("");
              }}
              className="text-grey-400 text-sm hover:text-grey-700"
            >
              back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col gap-4">
          <StartButton accent="purple" onClick={() => navigate({ to: "/game/create" })}>
            Create Room
          </StartButton>
          <StartButton accent="gold" onClick={() => setMode("join")}>
            Join Room
          </StartButton>
        </div>
      )}
    </div>
  );
};
