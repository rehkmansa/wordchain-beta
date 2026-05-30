import type { CreateRoomResponse, GameSettings } from "@repo/shared";
import { DEFAULT_SETTINGS } from "./fixtures";

// Mirrors POST /rooms + GET /rooms/:code so the create/join flow is a clean
// swap to REST later. Rooms live in-memory for the mock session.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L (backend room-codes.ts)

const genRoomCode = () =>
  Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)] ?? "A",
  ).join("");

type RoomReg = { gameId: string; settings: GameSettings; youIsHost: boolean };

const registry = new Map<string, RoomReg>();

// Reserved valid-format codes that demo the join error states.
export const JOIN_SENTINELS = {
  NOT_FOUND: "ZZ4044",
  LOCKED: "ZZ4100",
} as const;

export const createMockRoom = (settings: GameSettings): CreateRoomResponse => {
  const roomCode = genRoomCode();
  const gameId = `g-${roomCode}`;
  registry.set(roomCode, { gameId, settings, youIsHost: true });
  return { roomCode, gameId, wsUrl: `ws://mock/${roomCode}` };
};

type JoinResult =
  | { ok: true; roomCode: string }
  | { ok: false; code: "ROOM_NOT_FOUND" | "ROOM_LOCKED" };

export const joinMockRoom = (raw: string): JoinResult => {
  const code = raw.trim().toUpperCase();
  if (code === JOIN_SENTINELS.NOT_FOUND) return { ok: false, code: "ROOM_NOT_FOUND" };
  if (code === JOIN_SENTINELS.LOCKED) return { ok: false, code: "ROOM_LOCKED" };
  const existing = registry.get(code);
  registry.set(
    code,
    existing
      ? { ...existing, youIsHost: false }
      : { gameId: `g-${code}`, settings: DEFAULT_SETTINGS, youIsHost: false },
  );
  return { ok: true, roomCode: code };
};

export const getMockRoom = (roomCode: string): RoomReg => {
  const code = roomCode.toUpperCase();
  return registry.get(code) ?? { gameId: `g-${code}`, settings: DEFAULT_SETTINGS, youIsHost: true };
};
