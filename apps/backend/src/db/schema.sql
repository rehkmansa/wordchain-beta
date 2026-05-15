-- Wordchain V1 schema. Idempotent: safe to re-run.
-- See docs/DATA-MODEL.md for the source-of-truth descriptions.

PRAGMA foreign_keys = ON;

-- ─── auth (managed by better-auth, schema reproduced here) ───────────────

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  nickname       TEXT NOT NULL,
  image          TEXT,
  account_type   TEXT NOT NULL DEFAULT 'anon' CHECK (account_type IN ('anon','regular','pro')),
  token_balance  INTEGER NOT NULL DEFAULT 0,
  is_anonymous   INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions(token);

CREATE TABLE IF NOT EXISTS accounts (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id               TEXT NOT NULL,
  provider_id              TEXT NOT NULL,
  access_token             TEXT,
  refresh_token            TEXT,
  id_token                 TEXT,
  access_token_expires_at  INTEGER,
  refresh_token_expires_at INTEGER,
  scope                    TEXT,
  password                 TEXT,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

CREATE TABLE IF NOT EXISTS verifications (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON verifications(identifier);

-- ─── corpus ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS words (
  id         TEXT PRIMARY KEY,
  text       TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pairs (
  id          TEXT PRIMARY KEY,
  word_a_id   TEXT NOT NULL REFERENCES words(id),
  word_b_id   TEXT NOT NULL REFERENCES words(id),
  variants_a  TEXT NOT NULL DEFAULT '[]',
  variants_b  TEXT NOT NULL DEFAULT '[]',
  freq_tier   TEXT NOT NULL CHECK (freq_tier IN ('common','normal','rare')),
  source      TEXT NOT NULL CHECK (source IN ('seed','ai','user')),
  validated   INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  UNIQUE (word_a_id, word_b_id)
);

CREATE INDEX IF NOT EXISTS idx_pairs_validated_tier ON pairs(validated, freq_tier);
CREATE INDEX IF NOT EXISTS idx_pairs_word_a         ON pairs(word_a_id);
CREATE INDEX IF NOT EXISTS idx_pairs_word_b         ON pairs(word_b_id);

CREATE TABLE IF NOT EXISTS pair_review_queue (
  id            TEXT PRIMARY KEY,
  word_a        TEXT NOT NULL,
  word_b        TEXT NOT NULL,
  claimed_meta  TEXT NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  freq_signal   TEXT,
  reject_reason TEXT,
  created_at    INTEGER NOT NULL,
  processed_at  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pair_queue_status ON pair_review_queue(status, created_at);

-- ─── games (write-once at game_over) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS games (
  id         TEXT PRIMARY KEY,
  room_code  TEXT NOT NULL,
  mode       TEXT NOT NULL CHECK (mode IN ('solo','dual','group')),
  host_id    TEXT NOT NULL REFERENCES users(id),
  settings   TEXT NOT NULL,
  outcome    TEXT NOT NULL CHECK (outcome IN ('completed','abandoned')),
  winner_id  TEXT REFERENCES users(id),
  started_at INTEGER NOT NULL,
  ended_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_room_code  ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_host_id    ON games(host_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_started_at ON games(started_at);

CREATE TABLE IF NOT EXISTS game_players (
  id             TEXT PRIMARY KEY,
  game_id        TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL,
  is_ai          INTEGER NOT NULL DEFAULT 0,
  ai_persona     TEXT,
  final_score    INTEGER NOT NULL DEFAULT 0,
  placement      INTEGER NOT NULL,
  rounds_solved  INTEGER NOT NULL DEFAULT 0,
  hints_used     INTEGER NOT NULL DEFAULT 0,
  eliminated_at  INTEGER,
  disconnected   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_game_players_game_placement ON game_players(game_id, placement);
CREATE INDEX IF NOT EXISTS idx_game_players_user_score     ON game_players(user_id, final_score DESC);

CREATE TABLE IF NOT EXISTS game_rounds (
  id          TEXT PRIMARY KEY,
  game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  pair_id     TEXT NOT NULL REFERENCES pairs(id),
  hidden_side TEXT NOT NULL CHECK (hidden_side IN ('left','right')),
  outcomes    TEXT NOT NULL DEFAULT '[]',
  UNIQUE (game_id, round_index)
);

-- ─── active-room snapshot (deleted on game_over) ─────────────────────────

CREATE TABLE IF NOT EXISTS room_snapshots (
  room_code     TEXT PRIMARY KEY,
  game_id       TEXT NOT NULL,
  mode          TEXT NOT NULL CHECK (mode IN ('solo','dual','group')),
  host_id       TEXT NOT NULL REFERENCES users(id),
  status        TEXT NOT NULL CHECK (status IN ('playing')),
  settings      TEXT NOT NULL,
  current_round INTEGER NOT NULL,
  round_queue   TEXT NOT NULL,
  players       TEXT NOT NULL,
  updated_at    INTEGER NOT NULL
);
