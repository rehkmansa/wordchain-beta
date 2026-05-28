import { Hono } from "hono";
import { migrate } from "./db/migrate";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { gamesRouter } from "./routes/games";
import { roomsRouter } from "./routes/rooms";
import { sweepOrphanSnapshots } from "./state/snapshot";
import type { WsData } from "./ws/connections";
import { tryUpgrade, websocketHandlers } from "./ws/handler";
import { startIdleSweep } from "./ws/room-manager";

migrate();
sweepOrphanSnapshots();
startIdleSweep();

const app = new Hono();

app.get("/", (c) => c.json({ status: "ok" }));
app.get("/health/live", (c) => c.json({ status: "ok" }));

app.route("/api/auth", authRouter);
app.route("/api/rooms", roomsRouter);
app.route("/api/games", gamesRouter);

export default {
  port: env.port,
  async fetch(req: Request, server: import("bun").Server<WsData>) {
    const upgrade = await tryUpgrade(req, server);
    if (upgrade !== undefined) return upgrade;
    return app.fetch(req);
  },
  websocket: websocketHandlers,
};
