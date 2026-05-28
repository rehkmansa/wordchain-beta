import { Hono } from "hono";
import { db } from "../db";
import { requireSession } from "../middleware/session";

type GameRow = {
  id: string;
  room_code: string;
  mode: string;
  host_id: string;
  settings: string;
  outcome: string;
  winner_id: string | null;
  started_at: number;
  ended_at: number;
};

type PlayerRow = {
  user_id: string;
  is_ai: number;
  ai_persona: string | null;
  final_score: number;
  placement: number;
  rounds_solved: number;
  hints_used: number;
  eliminated_at: number | null;
  disconnected: number;
};

type RoundRow = {
  round_index: number;
  pair_id: string;
  hidden_side: string;
  outcomes: string;
};

function loadGameBundle(gameId: string) {
  const game = db.query<GameRow, [string]>("SELECT * FROM games WHERE id = ?").get(gameId);
  if (!game) return null;

  const players = db
    .query<PlayerRow, [string]>(
      "SELECT * FROM game_players WHERE game_id = ? ORDER BY placement ASC",
    )
    .all(gameId);

  const rounds = db
    .query<RoundRow, [string]>(
      "SELECT * FROM game_rounds WHERE game_id = ? ORDER BY round_index ASC",
    )
    .all(gameId);

  return {
    game: {
      id: game.id,
      roomCode: game.room_code,
      mode: game.mode,
      hostId: game.host_id,
      settings: JSON.parse(game.settings),
      outcome: game.outcome,
      winnerId: game.winner_id,
      startedAt: game.started_at,
      endedAt: game.ended_at,
    },
    players: players.map((p) => ({
      userId: p.user_id,
      isAi: p.is_ai === 1,
      aiPersona: p.ai_persona,
      finalScore: p.final_score,
      placement: p.placement,
      roundsSolved: p.rounds_solved,
      hintsUsed: p.hints_used,
      eliminatedAt: p.eliminated_at,
      disconnected: p.disconnected === 1,
    })),
    rounds: rounds.map((r) => ({
      roundIndex: r.round_index,
      pairId: r.pair_id,
      hiddenSide: r.hidden_side,
      outcomes: JSON.parse(r.outcomes),
    })),
  };
}

export const gamesRouter = new Hono();

gamesRouter.use("*", requireSession);

gamesRouter.get("/by-room/:code", (c) => {
  const code = c.req.param("code").toUpperCase();
  const row = db
    .query<{ id: string }, [string]>(
      "SELECT id FROM games WHERE room_code = ? ORDER BY started_at DESC LIMIT 1",
    )
    .get(code);
  if (!row) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "No completed game for this code" } },
      404,
    );
  }
  const bundle = loadGameBundle(row.id);
  if (!bundle) {
    return c.json({ error: { code: "NOT_FOUND", message: "Game vanished" } }, 404);
  }
  return c.json(bundle);
});

gamesRouter.get("/:gameId", (c) => {
  const bundle = loadGameBundle(c.req.param("gameId"));
  if (!bundle) {
    return c.json({ error: { code: "NOT_FOUND", message: "Game not found" } }, 404);
  }
  return c.json(bundle);
});
