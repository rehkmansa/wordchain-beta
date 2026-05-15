import { Hono } from "hono";
import { auth } from "../auth";
import { rateLimit } from "../lib/rate-limit";

export const authRouter = new Hono();

// Anon bootstrap. Idempotent: if a session cookie is already present, returns
// the existing user. Otherwise signs in anonymously via better-auth's anon
// plugin and forwards its Set-Cookie back to the caller.
authRouter.post("/anon", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown";

  const limit = rateLimit(`anon:${ip}`, 5, 60_000);
  if (!limit.ok) {
    c.header("Retry-After", String(Math.ceil(limit.retryAfterMs / 1000)));
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many anon requests" } }, 429);
  }

  const existing = await auth.api.getSession({ headers: c.req.raw.headers });
  if (existing?.user) {
    return c.json({
      user: {
        id: existing.user.id,
        account_type: (existing.user as { account_type?: string }).account_type ?? "anon",
        nickname: existing.user.name,
      },
      sessionExpiresAt: new Date(existing.session.expiresAt).getTime(),
    });
  }

  const res = await auth.api.signInAnonymous({
    headers: c.req.raw.headers,
    asResponse: true,
  });

  const setCookieHeaders: string[] = [];
  for (const [k, v] of res.headers) {
    if (k.toLowerCase() === "set-cookie") {
      c.header("Set-Cookie", v, { append: true });
      setCookieHeaders.push(v);
    }
  }

  const body = (await res.json()) as {
    token: string;
    user: { id: string; name: string };
  };

  // Reconstruct a request-style Cookie header from the response's Set-Cookie
  // so we can resolve the freshly-issued session and read its expiry.
  const cookieHeader = setCookieHeaders
    .map((sc) => sc.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
  const session = cookieHeader
    ? await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader }) })
    : null;

  return c.json({
    user: {
      id: body.user.id,
      account_type: "anon",
      nickname: body.user.name,
    },
    sessionExpiresAt: session ? new Date(session.session.expiresAt).getTime() : null,
  });
});

// Mount better-auth's standard endpoints (sign-up/email, sign-in/email,
// sign-out, session, etc.) at /api/auth/*.
authRouter.all("/*", (c) => auth.handler(c.req.raw));
