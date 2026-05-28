import { db } from "../db";
import { Mutex } from "../lib/mutex";
import type { PlayerState, Room } from "./rooms";

type SnapshotRow = {
  room_code: string;
  game_id: string;
  mode: string;
  host_id: string;
  status: string;
  settings: string;
  current_round: number;
  round_queue: string;
  players: string;
  updated_at: number;
};

type SerializedPlayer = Omit<PlayerState, "score"> & { score: number };

export function writeSnapshot(room: Room): void {
  if (room.status !== "playing") return;
  const players: SerializedPlayer[] = [...room.players.values()];
  db.run(
    `INSERT INTO room_snapshots
       (room_code, game_id, mode, host_id, status, settings, current_round, round_queue, players, updated_at)
     VALUES (?, ?, ?, ?, 'playing', ?, ?, ?, ?, ?)
     ON CONFLICT(room_code) DO UPDATE SET
       game_id = excluded.game_id,
       mode = excluded.mode,
       host_id = excluded.host_id,
       settings = excluded.settings,
       current_round = excluded.current_round,
       round_queue = excluded.round_queue,
       players = excluded.players,
       updated_at = excluded.updated_at`,
    [
      room.code,
      room.gameId,
      room.mode,
      room.hostId,
      JSON.stringify(room.settings),
      room.currentRound?.roundIndex ?? 0,
      JSON.stringify(room.roundQueue),
      JSON.stringify(players),
      Date.now(),
    ],
  );
}

export function deleteSnapshot(roomCode: string): void {
  db.run("DELETE FROM room_snapshots WHERE room_code = ?", [roomCode]);
}

// Rehydrate a Room from disk. Returns a fresh Room with `currentRound = null`;
// the round-scheduler is expected to start the *next* round (snapshot.current_round + 1)
// or end the game if the queue is exhausted.
export function loadSnapshot(roomCode: string): Room | null {
  const row = db
    .query<SnapshotRow, [string]>("SELECT * FROM room_snapshots WHERE room_code = ?")
    .get(roomCode);
  if (!row) return null;

  const players = new Map<string, PlayerState>();
  const serialized = JSON.parse(row.players) as PlayerState[];
  for (const p of serialized) players.set(p.id, p);

  return {
    code: row.room_code,
    gameId: row.game_id,
    hostId: row.host_id,
    mode: row.mode as Room["mode"],
    status: "playing",
    settings: JSON.parse(row.settings),
    players,
    roundQueue: JSON.parse(row.round_queue) as string[],
    finishedRounds: [],
    currentRound: null,
    startedAt: row.updated_at,
    createdAt: row.updated_at,
    mutex: new Mutex(),
  };
}

export function sweepOrphanSnapshots(): void {
  db.run(
    `DELETE FROM room_snapshots
     WHERE game_id IN (SELECT id FROM games)`,
  );
}
