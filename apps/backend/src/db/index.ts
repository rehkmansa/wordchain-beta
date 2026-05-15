import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../env";

mkdirSync(dirname(env.dbPath), { recursive: true });

export const db = new Database(env.dbPath, { create: true });

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA busy_timeout = 5000");
