import type { PublicPlayer, RoomStateMsg, ServerMessage } from "@repo/shared";
import type { Room } from "../state/rooms";
import { connectionFor, connectionsFor } from "./connections";

export function send(roomCode: string, userId: string, msg: ServerMessage): void {
  const ws = connectionFor(userId, roomCode);
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

export function broadcast(roomCode: string, msg: ServerMessage): void {
  const payload = JSON.stringify(msg);
  for (const ws of connectionsFor(roomCode)) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

function buildRoomState(room: Room): RoomStateMsg {
  const players: PublicPlayer[] = [];
  for (const p of room.players.values()) {
    players.push({
      id: p.id,
      nickname: p.nickname,
      isHost: p.id === room.hostId,
      isAi: p.isAi,
      connected: !p.disconnected,
      score: p.score,
      streak: p.streak,
      multiplier: p.multiplier,
      livesLeft: p.livesLeft,
      hintsUsedTotal: p.hintsUsedTotal,
    });
  }
  const host = room.players.get(room.hostId);
  return {
    type: "room_state",
    roomCode: room.code,
    gameId: room.gameId,
    mode: room.mode,
    status: room.status,
    host: { id: room.hostId, nickname: host?.nickname ?? "" },
    settings: room.settings,
    players,
    currentRoundIndex: room.currentRound?.roundIndex ?? null,
    totalRounds: room.settings.chainLength,
  };
}

export function broadcastRoomState(room: Room): void {
  broadcast(room.code, buildRoomState(room));
}
