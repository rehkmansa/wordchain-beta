import { getRouteApi, Outlet, useNavigate } from "@tanstack/react-router";
import { GameProvider } from "~/lib/game/provider";
import { Button } from "~/ui/button";
import { Emoji } from "~/ui/emoji";

const route = getRouteApi("/game/$roomId");

export const GameLayout = () => {
  const { roomCode, gameId, userId, nickname, mode, settings } = route.useLoaderData();

  return (
    <GameProvider
      roomCode={roomCode}
      gameId={gameId}
      youId={userId}
      nickname={nickname}
      mode={mode}
      settings={settings}
    >
      <Outlet />
    </GameProvider>
  );
};

export const RoomConnecting = () => (
  <div className="grid min-h-screen place-items-center bg-linear-to-b from-brand-purple-500 to-brand-purple-700 text-white/70">
    <div className="flex flex-col items-center gap-3 font-sans font-semibold text-[15px]">
      <Emoji name="dash" size={28} className="animate-pulse" />
      Connecting…
    </div>
  </div>
);

const ERROR_COPY: Record<string, string> = {
  ROOM_NOT_FOUND: "We couldn't find a room with that code.",
  ROOM_FULL: "That room is full.",
  ROOM_LOCKED: "That game has already started.",
};

export const RoomError = ({ error }: { error: Error }) => {
  const navigate = useNavigate();
  const message = ERROR_COPY[error.message] ?? "Something went wrong joining that room.";

  return (
    <div className="grid min-h-screen place-items-center bg-linear-to-b from-brand-purple-500 to-brand-purple-800 px-6 text-white">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <Emoji name="sad" size={56} />
        <p className="font-sans font-semibold text-[18px]">{message}</p>
        <Button onClick={() => navigate({ to: "/" })}>Back home</Button>
      </div>
    </div>
  );
};
