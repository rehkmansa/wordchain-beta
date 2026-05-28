import type { GameMode, GameSettings } from "@repo/shared";
import { Hono } from "hono";
import { newId } from "../lib/ids";
import { Mutex } from "../lib/mutex";
import { rateLimit } from "../lib/rate-limit";
import { getUser, requireSession } from "../middleware/session";
import { generateRoomCode } from "../state/room-codes";
import { findHostedRoom, isCodeInUse, maxPlayersFor, type Room, rooms } from "../state/rooms";

const VALID_ROUND_TIMES = new Set([10000, 15000, 20000, 30000, 60000]);

function validateSettings(mode: GameMode, settings: GameSettings): string | null {
  if (
    !Number.isInteger(settings.chainLength) ||
    settings.chainLength < 3 ||
    settings.chainLength > 20
  )
    return "chainLength must be an integer in [3, 20]";
  if (!VALID_ROUND_TIMES.has(settings.roundTimeMs))
    return "roundTimeMs must be one of 10000/15000/20000/30000/60000";
  if (settings.elimination) {
    const lives = settings.lives ?? 3;
    if (!Number.isInteger(lives) || lives < 1 || lives > 9)
      return "lives must be an integer in [1, 9] when elimination is on";
  }
  if (mode === "solo" && !settings.aiDifficulty) return "aiDifficulty is required when mode='solo'";
  return null;
}

export const roomsRouter = new Hono();

roomsRouter.use("*", requireSession);

roomsRouter.post("/", async (c) => {
  const user = getUser(c);

  const limit = rateLimit(`rooms:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    c.header("Retry-After", String(Math.ceil(limit.retryAfterMs / 1000)));
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many rooms created" } }, 429);
  }

  const body = (await c.req.json().catch(() => null)) as {
    mode?: GameMode;
    settings?: GameSettings;
  } | null;
  if (!body?.mode || !body.settings) {
    return c.json(
      { error: { code: "INVALID_SETTINGS", message: "mode and settings required" } },
      400,
    );
  }
  const err = validateSettings(body.mode, body.settings);
  if (err) {
    return c.json({ error: { code: "INVALID_SETTINGS", message: err } }, 400);
  }

  if (findHostedRoom(user.id)) {
    return c.json(
      { error: { code: "TOO_MANY_ROOMS", message: "Already hosting an active room" } },
      429,
    );
  }

  const code = generateRoomCode(isCodeInUse);
  const gameId = newId();
  const settings: GameSettings = {
    chainLength: body.settings.chainLength,
    roundTimeMs: body.settings.roundTimeMs,
    elimination: body.settings.elimination,
    lives: body.settings.elimination ? (body.settings.lives ?? 3) : undefined,
    aiDifficulty: body.mode === "solo" ? body.settings.aiDifficulty : undefined,
  };

  const room: Room = {
    code,
    gameId,
    hostId: user.id,
    mode: body.mode,
    status: "waiting",
    settings,
    players: new Map([
      [
        user.id,
        {
          id: user.id,
          nickname: user.nickname,
          isAi: false,
          aiPersona: null,
          score: 0,
          streak: 0,
          multiplier: 1,
          livesLeft: settings.elimination ? (settings.lives ?? 3) : null,
          hintsUsedTotal: 0,
          eliminatedAt: null,
          disconnected: false,
        },
      ],
    ]),
    roundQueue: [],
    finishedRounds: [],
    currentRound: null,
    startedAt: null,
    createdAt: Date.now(),
    mutex: new Mutex(),
  };
  rooms.set(code, room);

  return c.json(
    {
      roomCode: code,
      gameId,
      wsUrl: `/api/ws?room=${code}&gameId=${gameId}`,
    },
    201,
  );
});

roomsRouter.get("/:code", (c) => {
  const code = c.req.param("code").toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return c.json({ error: { code: "ROOM_NOT_FOUND", message: "Room not found" } }, 404);
  }
  if (room.status === "playing") {
    return c.json({ error: { code: "ROOM_LOCKED", message: "Game already started" } }, 410);
  }
  if (room.players.size >= maxPlayersFor(room.mode)) {
    return c.json({ error: { code: "ROOM_FULL", message: "Room is full" } }, 409);
  }
  return c.json({
    roomCode: room.code,
    gameId: room.gameId,
    mode: room.mode,
    status: room.status === "finished" ? "playing" : room.status,
    playerCount: room.players.size,
    maxPlayers: maxPlayersFor(room.mode),
    settings: room.settings,
  });
});
