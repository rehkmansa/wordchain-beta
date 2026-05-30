import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { JOIN_SENTINELS, joinMockRoom } from "~/lib/mock/rooms";
import { Button } from "~/ui/button";
import { Input } from "~/ui/input";
import { StartScreenHeader } from "~/ui/start-screens/header";

const ERROR_COPY: Record<"ROOM_NOT_FOUND" | "ROOM_LOCKED", string> = {
  ROOM_NOT_FOUND: "We couldn't find a room with that code",
  ROOM_LOCKED: "That game has already started",
};

export const Page = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<"ROOM_NOT_FOUND" | "ROOM_LOCKED" | null>(null);

  const trimmed = code.trim();
  const ready = trimmed.length > 0;

  const handleJoin = () => {
    if (!ready) return;
    const result = joinMockRoom(trimmed);
    if (result.ok) {
      navigate({ to: "/game/$roomId/lobby", params: { roomId: result.roomCode } });
    } else {
      setError(result.code);
    }
  };

  return (
    <div className="flex flex-col items-center px-12 pt-25">
      <div className="mb-10 max-w-100">
        <StartScreenHeader title="Join Game" desc="Join a game by entering the code below" />
      </div>

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
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="JVQEPT"
            maxLength={6}
            autoFocus
          />
          {error && (
            <p className="text-center font-sans font-medium text-[14px] text-danger-500">
              {ERROR_COPY[error]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Button onClick={handleJoin} disabled={!ready}>
            Join Room
          </Button>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="font-sans text-[15px] text-grey-400 outline-none cursor-hand hover:text-grey-700"
          >
            Back
          </button>
        </div>

        {import.meta.env.DEV && (
          <p className="text-center font-mono text-[11px] text-grey-300">
            dev: {JOIN_SENTINELS.NOT_FOUND} = not found · {JOIN_SENTINELS.LOCKED} = locked · else
            joins
          </p>
        )}
      </div>
    </div>
  );
};
