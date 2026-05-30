import { apiFetch } from "./client";

type AnonResponse = {
  user: { id: string; account_type: string; nickname: string };
  sessionExpiresAt: number | null;
};

type Session = { userId: string; nickname: string };

// POST /auth/anon is idempotent (returns the existing user when a session cookie
// is present) but rate-limited, so we cache and de-dupe in-flight calls.
let cached: Session | null = null;
let inflight: Promise<Session> | null = null;

export const ensureAnonSession = async (): Promise<Session> => {
  if (cached) return cached;
  if (!inflight) {
    inflight = apiFetch<AnonResponse>("/auth/anon", { method: "POST" })
      .then((res) => {
        cached = { userId: res.user.id, nickname: res.user.nickname };
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};
