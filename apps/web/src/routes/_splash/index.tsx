import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { StartScreenHeader } from "~/ui/start-screens/header/header";

type Mode = "default" | "join";

const Landing = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("default");
  const [code, setCode] = useState("");

  const isJoin = mode === "join";
  const title = isJoin ? "Join Game" : "Word Chains";
  const description = isJoin
    ? "Join a game by entering the code below"
    : "Relax, explore, and enjoy simple word puzzles at your own pace.";

  const handleJoin = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate({ to: "/game/$roomId/lobby", params: { roomId: trimmed } });
  };

  return (
    <div className="flex flex-col items-center pt-25   px-12">
      <div className="mb-10 max-w-100">
        <StartScreenHeader title={title} desc={description} />
      </div>

      {isJoin ? (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter room code"
            className="border border-neutral-300 rounded-full px-5 py-3 text-center focus:outline-none focus:border-neutral-500"
          />
          <button
            type="button"
            onClick={handleJoin}
            className="border border-neutral-300 rounded-full px-5 py-3 hover:bg-neutral-50"
          >
            join room
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("default");
              setCode("");
            }}
            className="text-sm text-neutral-500 hover:text-neutral-700 mt-2"
          >
            back
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            type="button"
            onClick={() => navigate({ to: "/game/create" })}
            className="border border-neutral-300 rounded-full px-5 py-3 hover:bg-neutral-50"
          >
            create
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className="border border-neutral-300 rounded-full px-5 py-3 hover:bg-neutral-50"
          >
            join
          </button>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/_splash/")({
  component: Landing,
});
