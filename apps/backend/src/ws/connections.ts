import type { ServerWebSocket } from "bun";

export type WsData = {
  userId: string;
  nickname: string;
  roomCode: string;
  gameId: string;
  rtt: { samples: number[]; minRtt: number; offsetMs: number };
  syncInterval: ReturnType<typeof setInterval> | null;
};

export type Ws = ServerWebSocket<WsData>;

const byUserRoom = new Map<string, Ws>();
const byRoom = new Map<string, Set<Ws>>();

function key(userId: string, roomCode: string): string {
  return `${userId}@${roomCode}`;
}

export function register(ws: Ws): Ws | null {
  const k = key(ws.data.userId, ws.data.roomCode);
  const prior = byUserRoom.get(k) ?? null;
  byUserRoom.set(k, ws);

  const set = byRoom.get(ws.data.roomCode) ?? new Set<Ws>();
  if (prior) set.delete(prior);
  set.add(ws);
  byRoom.set(ws.data.roomCode, set);
  return prior;
}

export function unregister(ws: Ws): void {
  const k = key(ws.data.userId, ws.data.roomCode);
  if (byUserRoom.get(k) === ws) byUserRoom.delete(k);
  const set = byRoom.get(ws.data.roomCode);
  if (set) {
    set.delete(ws);
    if (set.size === 0) byRoom.delete(ws.data.roomCode);
  }
}

export function connectionsFor(roomCode: string): Iterable<Ws> {
  return byRoom.get(roomCode) ?? [];
}

export function connectionFor(userId: string, roomCode: string): Ws | undefined {
  return byUserRoom.get(key(userId, roomCode));
}
