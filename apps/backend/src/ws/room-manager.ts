import { ERROR_CODES } from "@repo/shared";
import { db } from "../db";
import { AI_NICKNAME, AI_USER_ID } from "../game/ai-player";
import { endGame, startGame } from "../game/round-scheduler";
import { maxPlayersFor, minPlayersFor, type PlayerState, type Room, rooms } from "../state/rooms";
import { broadcastRoomState, send } from "./broadcast";
import { connectionFor, connectionsFor, unregister } from "./connections";

const NICKNAME_MAX = 20;

const DISCONNECT_GRACE_MS = 60_000;
const IDLE_SWEEP_INTERVAL_MS = 60_000;
const WAITING_IDLE_TIMEOUT_MS = 10 * 60_000;

const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

function disconnectKey(roomCode: string, userId: string): string {
  return `${roomCode}@${userId}`;
}

export async function joinRoom(room: Room, userId: string, nickname: string): Promise<void> {
  await room.mutex.run(() => {
    const existing = room.players.get(userId);
    if (existing) {
      existing.disconnected = false;
      const t = disconnectTimers.get(disconnectKey(room.code, userId));
      if (t) {
        clearTimeout(t);
        disconnectTimers.delete(disconnectKey(room.code, userId));
      }
      return;
    }
    if (room.status === "playing") {
      send(room.code, userId, {
        type: "error",
        code: ERROR_CODES.ROOM_LOCKED,
        message: "Game already started",
      });
      return;
    }
    if (room.players.size >= maxPlayersFor(room.mode)) {
      send(room.code, userId, {
        type: "error",
        code: ERROR_CODES.ROOM_FULL,
        message: "Room is full",
      });
      return;
    }
    const player: PlayerState = {
      id: userId,
      nickname,
      isAi: false,
      aiPersona: null,
      score: 0,
      streak: 0,
      multiplier: 1,
      livesLeft: room.settings.elimination ? (room.settings.lives ?? 3) : null,
      hintsUsedTotal: 0,
      eliminatedAt: null,
      disconnected: false,
    };
    room.players.set(userId, player);
  });
  broadcastRoomState(room);
  maybeAutoStartDual(room);
}

export function setNickname(room: Room, userId: string, raw: string): void {
  const nickname = raw.trim().slice(0, NICKNAME_MAX);
  if (!nickname) return;
  const player = room.players.get(userId);
  if (!player || player.isAi || player.nickname === nickname) return;
  player.nickname = nickname;
  // Persist: nickname is the better-auth user.name, re-read from the DB on every
  // WS (re)connect, so it must survive into future rooms.
  db.query("UPDATE users SET nickname = ?, updated_at = ? WHERE id = ?").run(
    nickname,
    Date.now(),
    userId,
  );
  broadcastRoomState(room);
}

export async function leaveRoom(room: Room, userId: string): Promise<void> {
  await room.mutex.run(() => {
    if (userId === room.hostId && room.status === "waiting") {
      // Host quitting the lobby tears the room down.
      endGameAbandoned(room);
      return;
    }
    const player = room.players.get(userId);
    if (!player) return;
    if (room.status === "playing") {
      player.disconnected = true;
      player.eliminatedAt = Date.now();
    } else {
      room.players.delete(userId);
    }
  });
  broadcastRoomState(room);
}

export async function handleDisconnect(roomCode: string, userId: string): Promise<void> {
  const room = rooms.get(roomCode);
  if (!room) return;
  await room.mutex.run(() => {
    const player = room.players.get(userId);
    if (!player) return;
    player.disconnected = true;

    // Grace period so a reload / tab-switch / transient drop doesn't tear the
    // room down. Reconnecting (joinRoom) clears this timer before it fires.
    const key = disconnectKey(roomCode, userId);
    const existing = disconnectTimers.get(key);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      void room.mutex.run(() => {
        disconnectTimers.delete(key);
        const p = room.players.get(userId);
        if (!p?.disconnected) return; // reconnected in time
        if (room.status === "waiting") {
          if (userId === room.hostId) {
            endGameAbandoned(room);
            return;
          }
          room.players.delete(userId);
          broadcastRoomState(room);
        } else if (room.status === "playing") {
          if (p.eliminatedAt === null) p.eliminatedAt = Date.now();
          maybeEndIfTooFew(room);
        }
      });
    }, DISCONNECT_GRACE_MS);
    disconnectTimers.set(key, t);
  });
  broadcastRoomState(room);
}

export async function requestStart(room: Room, userId: string): Promise<void> {
  if (userId !== room.hostId) {
    send(room.code, userId, {
      type: "error",
      code: ERROR_CODES.NOT_HOST,
      message: "Only host can start the game",
    });
    return;
  }
  if (room.status !== "waiting") return;
  if (room.players.size < minPlayersFor(room.mode)) return;

  await room.mutex.run(async () => {
    if (room.status !== "waiting") return;
    await startGame(room);
  });
}

// Solo mode bootstrap: inject AI player and start immediately on first connect.
export async function bootstrapSoloIfNeeded(room: Room): Promise<void> {
  if (room.mode !== "solo") return;
  if (room.status !== "waiting") return;
  await room.mutex.run(async () => {
    if (room.status !== "waiting") return;
    if (!room.players.has(AI_USER_ID)) {
      room.players.set(AI_USER_ID, {
        id: AI_USER_ID,
        nickname: AI_NICKNAME,
        isAi: true,
        aiPersona: "steady",
        score: 0,
        streak: 0,
        multiplier: 1,
        livesLeft: room.settings.elimination ? (room.settings.lives ?? 3) : null,
        hintsUsedTotal: 0,
        eliminatedAt: null,
        disconnected: false,
      });
    }
    await startGame(room);
  });
}

function maybeAutoStartDual(room: Room): void {
  if (room.mode !== "dual") return;
  if (room.status !== "waiting") return;
  let connectedCount = 0;
  for (const p of room.players.values()) {
    if (!p.disconnected && !p.isAi) connectedCount += 1;
  }
  if (connectedCount >= 2) {
    void room.mutex.run(async () => {
      if (room.status !== "waiting") return;
      let stillConnected = 0;
      for (const p of room.players.values()) {
        if (!p.disconnected && !p.isAi) stillConnected += 1;
      }
      if (stillConnected >= 2) await startGame(room);
    });
  }
}

function maybeEndIfTooFew(room: Room): void {
  if (room.status !== "playing") return;
  let active = 0;
  for (const p of room.players.values()) {
    if (!p.isAi && p.eliminatedAt === null && !p.disconnected) active += 1;
  }
  if (active < minPlayersFor(room.mode)) {
    endGame(room, "abandoned");
  }
}

function endGameAbandoned(room: Room): void {
  endGame(room, "abandoned");
  for (const ws of connectionsFor(room.code)) {
    unregister(ws);
    ws.close(1000, "room destroyed");
  }
}

export function startIdleSweep(): void {
  setInterval(() => {
    const now = Date.now();
    for (const room of [...rooms.values()]) {
      if (room.status !== "waiting") continue;
      if (now - room.createdAt < WAITING_IDLE_TIMEOUT_MS) continue;
      const hasLive = [...room.players.values()].some(
        (p) => !p.disconnected && !!connectionFor(p.id, room.code),
      );
      if (!hasLive) endGame(room, "abandoned");
    }
  }, IDLE_SWEEP_INTERVAL_MS).unref();
}
