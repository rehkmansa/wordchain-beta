// Non-ambiguous alphabet (no 0/O/1/I/L). ~30^6 = ~729M codes.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LEN = 6;
const RECYCLE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// roomCode → ms-epoch when it can be reused.
const recentCodes = new Map<string, number>();

function pickCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function generateRoomCode(isInUse: (code: string) => boolean): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = pickCode();
    const cooldownUntil = recentCodes.get(code);
    if (cooldownUntil && cooldownUntil > Date.now()) continue;
    if (isInUse(code)) continue;
    return code;
  }
  throw new Error("Failed to generate non-colliding room code");
}

export function markCodeRecycled(code: string): void {
  recentCodes.set(code, Date.now() + RECYCLE_COOLDOWN_MS);
  // Periodic janitor: drop expired entries.
  if (recentCodes.size > 1000) {
    const now = Date.now();
    for (const [k, until] of recentCodes) {
      if (until <= now) recentCodes.delete(k);
    }
  }
}
