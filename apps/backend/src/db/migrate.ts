import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "./index";

export function migrate(): void {
  const schemaPath = join(import.meta.dir, "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  const stripped = sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  const statements = stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) db.run(stmt);
}
