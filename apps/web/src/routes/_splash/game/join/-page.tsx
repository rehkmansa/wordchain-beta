import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ensureAnonSession } from "~/lib/api/auth";
import { getRoom } from "~/lib/api/rooms";
import { Button } from "~/ui/button";
import { Input } from "~/ui/input";
import { StartScreenHeader } from "~/ui/start-screens/header";

const ERROR_COPY: Record<string, string> = {
  ROOM_NOT_FOUND: "We couldn't find a room with that code",
  ROOM_LOCKED: "That game has already started",
  ROOM_FULL: "That room is full",
};

export const Page = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const trimmed = code.trim();
  const ready = trimmed.length > 0 && !joining;

  const handleJoin = async () => {
    if (!ready) return;
    setJoining(true);
    setError(null);
    try {
      await ensureAnonSession();
      const result = await getRoom(trimmed);
      if (result.ok) {
        sessionStorage.setItem(`wc:game:${result.room.roomCode}`, result.room.gameId);
        navigate({ to: "/game/$roomId/lobby", params: { roomId: result.room.roomCode } });
        return;
      }
      setError(ERROR_COPY[result.code] ?? "Couldn't join that room. Please try again.");
      setJoining(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 pt-25 sm:px-12">
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
            <p className="text-center font-sans font-medium text-[14px] text-danger-500">{error}</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Button onClick={() => void handleJoin()} disabled={!ready}>
            {joining ? "Joining…" : "Join Room"}
          </Button>
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="font-sans text-[15px] text-grey-400 outline-none cursor-hand hover:text-grey-700"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
