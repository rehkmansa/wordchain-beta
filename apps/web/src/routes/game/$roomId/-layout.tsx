import { Outlet, useParams } from "@tanstack/react-router";
import { BypassBar } from "~/lib/mock/bypass-bar";
import { getMockRoom } from "~/lib/mock/rooms";
import { MockGameProvider } from "~/lib/mock/use-mock-game";

export const GameLayout = () => {
  const { roomId } = useParams({ from: "/game/$roomId" });
  const reg = getMockRoom(roomId);

  return (
    <MockGameProvider
      roomCode={roomId}
      gameId={reg.gameId}
      settings={reg.settings}
      youIsHost={reg.youIsHost}
    >
      <Outlet />
      <BypassBar />
    </MockGameProvider>
  );
};
