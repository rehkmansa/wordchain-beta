import { Hono } from "hono";
import { migrate } from "./db/migrate";
import { env } from "./env";
import { authRouter } from "./routes/auth";

migrate();

const app = new Hono();

app.get("/", (c) => c.json({ status: "ok" }));
app.get("/health/live", (c) => c.json({ status: "ok" }));

app.route("/api/auth", authRouter);

export default {
  port: env.port,
  fetch: app.fetch,
};
