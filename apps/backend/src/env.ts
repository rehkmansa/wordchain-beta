const isProd = process.env.NODE_ENV === "production";

function required(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 3001),
  dbPath: process.env.DB_PATH ?? "./data/wordchain.db",
  baseUrl: process.env.BASE_URL ?? "http://localhost:3001",
  authSecret: required(
    "AUTH_SECRET",
    isProd ? undefined : "dev-only-secret-change-me-please-32chars",
  ),
};
