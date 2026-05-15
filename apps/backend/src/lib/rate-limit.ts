type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  const oldest = bucket.hits[0];
  if (bucket.hits.length >= max && oldest !== undefined) {
    return { ok: false, retryAfterMs: oldest + windowMs - now };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}

// Janitor: drop empty buckets every minute so the map doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => t > cutoff);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}, 60_000).unref();
