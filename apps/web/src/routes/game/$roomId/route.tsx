import { createFileRoute } from "@tanstack/react-router";
import { ensureAnonSession } from "~/lib/api/auth";
import { getRoom } from "~/lib/api/rooms";
import { DEFAULT_SETTINGS } from "~/lib/constants";
import { GameLayout, RoomConnecting, RoomError } from "./-layout";

export const Route = createFileRoute("/game/$roomId")({
  loader: async ({ params }) => {
    const session = await ensureAnonSession();
    const code = params.roomId.toUpperCase();
    const result = await getRoom(code);

    if (result.ok) {
      sessionStorage.setItem(`wc:game:${code}`, result.room.gameId);
      return {
        ...session,
        roomCode: code,
        gameId: result.room.gameId,
        mode: result.room.mode,
        settings: result.room.settings,
      };
    }

    // In-progress room: reconnect with a gameId stashed at create/join time.
    const stashed = sessionStorage.getItem(`wc:game:${code}`);
    if (result.code === "ROOM_LOCKED" && stashed) {
      return {
        ...session,
        roomCode: code,
        gameId: stashed,
        mode: "group" as const,
        settings: DEFAULT_SETTINGS,
      };
    }

    throw new Error(result.code);
  },
  component: GameLayout,
  pendingComponent: RoomConnecting,
  errorComponent: RoomError,
});
