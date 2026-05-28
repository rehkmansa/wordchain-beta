import type { Context, MiddlewareHandler } from "hono";
import { auth } from "../auth";

type SessionUser = {
  id: string;
  nickname: string;
  accountType: string;
};

declare module "hono" {
  interface ContextVariableMap {
    user: SessionUser;
  }
}

export const requireSession: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: { code: "UNAUTHENTICATED", message: "Session required" } }, 401);
  }
  const u = session.user as {
    id: string;
    name: string;
    account_type?: string;
  };
  c.set("user", {
    id: u.id,
    nickname: u.name,
    accountType: u.account_type ?? "anon",
  });
  await next();
};

export function getUser(c: Context): SessionUser {
  return c.get("user");
}
