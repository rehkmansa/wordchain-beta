import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

type Mode = "default" | "join";

function Landing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("default");
  const [code, setCode] = useState("");

  const isJoin = mode === "join";
  const title = isJoin ? "Join Game" : "Word\nChains";
  const description = isJoin
    ? "Join a game by entering the code below"
    : "Relax, explore, and enjoy simple word puzzles at your own pace.";

  const handleJoin = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate({ to: "/game/$roomId/lobby", params: { roomId: trimmed } });
  };

  return (
    <div className="min-h-screen grid grid-cols-2">
      <div className="border-r border-neutral-200" />

      <div className="flex flex-col items-center justify-center px-12">
        <h1 className="text-5xl text-center whitespace-pre-line mb-6">{title}</h1>

        <p className="text-center text-neutral-600 mb-10 max-w-sm">{description}</p>

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
    </div>
  );
}
