import type { ClientMessage } from "@repo/shared";
import { ERROR_CODES } from "@repo/shared";
import type { Server } from "bun";
import { auth } from "../auth";
import { applyHint } from "../game/hint-engine";
import { handleSubmit } from "../game/round-scheduler";
import { rooms } from "../state/rooms";
import { loadSnapshot } from "../state/snapshot";
import { broadcastRoomState } from "./broadcast";
import { connectionFor, register, unregister, type Ws, type WsData } from "./connections";
import {
  bootstrapSoloIfNeeded,
  handleDisconnect,
  joinRoom,
  leaveRoom,
  requestStart,
} from "./room-manager";
import { handleTimeSyncAck, startTimeSyncLoop, stopTimeSyncLoop } from "./time-sync";

const WS_SUPERSEDED = 4001;
const WS_GAME_ID_MISMATCH = 4002;

export async function tryUpgrade(
  req: Request,
  server: Server<WsData>,
): Promise<Response | undefined> {
  const url = new URL(req.url);
  if (url.pathname !== "/api/ws") return undefined;

  const roomCode = url.searchParams.get("room")?.toUpperCase();
  const gameId = url.searchParams.get("gameId");
  if (!roomCode || !gameId) {
    return new Response("missing room or gameId", { status: 400 });
  }

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return new Response("unauthorized", { status: 401 });
  const userId = session.user.id;
  const nickname = session.user.name ?? "anon";

  let room = rooms.get(roomCode);
  if (!room) {
    const restored = loadSnapshot(roomCode);
    if (restored) {
      rooms.set(roomCode, restored);
      room = restored;
    }
  }
  if (!room) return new Response("room not found", { status: 404 });
  if (room.gameId !== gameId) return new Response("game id mismatch", { status: 409 });

  const data: WsData = {
    userId,
    nickname,
    roomCode,
    gameId,
    rtt: { samples: [], minRtt: 150, offsetMs: 0 },
    syncInterval: null,
  };

  const upgraded = server.upgrade(req, { data });
  if (upgraded) return undefined;
  return new Response("upgrade failed", { status: 400 });
}

export const websocketHandlers = {
  open(ws: Ws) {
    const prior = register(ws);
    if (prior && prior !== ws) {
      try {
        prior.close(WS_SUPERSEDED, "superseded");
      } catch {
        /* ignore */
      }
    }
    startTimeSyncLoop(ws);

    const room = rooms.get(ws.data.roomCode);
    if (!room) {
      try {
        ws.close(WS_GAME_ID_MISMATCH, "room vanished");
      } catch {
        /* ignore */
      }
      return;
    }
    if (room.gameId !== ws.data.gameId) {
      try {
        ws.close(WS_GAME_ID_MISMATCH, "game id mismatch");
      } catch {
        /* ignore */
      }
      return;
    }

    void (async () => {
      await joinRoom(room, ws.data.userId, ws.data.nickname);
      broadcastRoomState(room);
      if (room.mode === "solo" && room.status === "waiting") {
        await bootstrapSoloIfNeeded(room);
      }

      // Re-send current round state on reconnect to anyone mid-game.
      if (room.status === "playing" && room.currentRound) {
        const r = room.currentRound;
        const player = room.players.get(ws.data.userId);
        if (player && !player.isAi) {
          const hidden = r.hiddenWord;
          ws.send(
            JSON.stringify({
              type: "round_start",
              roundIndex: r.roundIndex,
              visibleSide: r.visibleSide,
              visibleWord: r.visibleWord,
              hiddenLength: hidden.length,
              hiddenFirstChar: hidden[0] ?? "",
              roundStartsAt: r.roundStartsAt,
              roundEndsAt: r.roundEndsAt,
              maxHints: Math.floor(hidden.length / 2),
              hintCooldownMs: Math.max(
                0,
                (room.settings.roundTimeMs - Math.max(room.settings.roundTimeMs / 3, 10_000)) /
                  Math.max(1, Math.floor(hidden.length / 2)),
              ),
              yourState: {
                points: player.score,
                streak: player.streak,
                multiplier: player.multiplier,
                livesLeft: player.livesLeft,
              },
            }),
          );
        }
      }
    })();
  },

  message(ws: Ws, raw: string | Buffer) {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as ClientMessage;
    } catch {
      return;
    }
    const room = rooms.get(ws.data.roomCode);
    if (!room) return;

    switch (parsed.type) {
      case "time_sync_ack":
        handleTimeSyncAck(ws, parsed);
        return;
      case "join_room":
        void joinRoom(room, ws.data.userId, ws.data.nickname);
        return;
      case "start_game":
        void requestStart(room, ws.data.userId);
        return;
      case "submit_answer":
        void room.mutex.run(() => {
          const r = handleSubmit(room, ws.data.userId, parsed.roundIndex, parsed.answer);
          if ("code" in r) {
            ws.send(JSON.stringify({ type: "error", code: r.code, message: r.code }));
          }
        });
        return;
      case "request_hint":
        void room.mutex.run(() => {
          if (room.currentRound?.roundIndex !== parsed.roundIndex) {
            ws.send(
              JSON.stringify({
                type: "error",
                code: ERROR_CODES.WRONG_ROUND,
                message: "round mismatch",
              }),
            );
            return;
          }
          const result = applyHint(room, ws.data.userId, Date.now());
          if (!result.ok) {
            ws.send(JSON.stringify({ type: "error", code: result.code, message: result.code }));
            return;
          }
          ws.send(
            JSON.stringify({
              type: "hint_revealed",
              roundIndex: parsed.roundIndex,
              index: result.index,
              char: result.char,
              hintsUsedNow: result.hintsUsedNow,
              pointsRemaining: result.pointsRemaining,
              cooldownExpiresAt: result.cooldownExpiresAt,
            }),
          );
        });
        return;
      case "leave_room":
        void leaveRoom(room, ws.data.userId);
        try {
          ws.close(1000, "left");
        } catch {
          /* ignore */
        }
        return;
    }
  },

  close(ws: Ws) {
    stopTimeSyncLoop(ws);
    const existing = connectionFor(ws.data.userId, ws.data.roomCode);
    if (existing && existing !== ws) {
      // A new connection has already replaced us; do not mark disconnected.
      unregister(ws);
      return;
    }
    unregister(ws);
    void handleDisconnect(ws.data.roomCode, ws.data.userId);
  },
};
