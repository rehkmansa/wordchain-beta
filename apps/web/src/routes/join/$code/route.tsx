import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureAnonSession } from "~/lib/api/auth";
import { getRoom } from "~/lib/api/rooms";
import { JoinError, JoinPending } from "./-page";

// Shareable invite link. Authenticates, validates the room, then drops the
// visitor straight into the waiting room (the lobby loader does the WS join).
export const Route = createFileRoute("/join/$code")({
  loader: async ({ params }) => {
    await ensureAnonSession();
    const code = params.code.toUpperCase();
    const result = await getRoom(code);
    if (!result.ok) throw new Error(result.code);
    sessionStorage.setItem(`wc:game:${code}`, result.room.gameId);
    throw redirect({ to: "/game/$roomId/lobby", params: { roomId: code } });
  },
  pendingComponent: JoinPending,
  component: JoinPending,
  errorComponent: JoinError,
});
