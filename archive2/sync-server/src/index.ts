import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireAuth } from "./auth.ts";
import { ensureDataDir, read, write } from "./storage.ts";

const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

await ensureDataDir();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (requestOrigin) =>
      ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : null,
    allowMethods: ["GET", "PUT", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "X-Expected-Version"],
    exposeHeaders: ["X-Sync-Version", "X-Sync-Updated-At"],
  }),
);

app.get("/healthz", (c) => c.text("ok"));

app.get("/sync/version", requireAuth, async (c) => {
  const data = await read();
  return c.json({
    version: data?.version ?? 0,
    updatedAt: data?.updatedAt ?? null,
  });
});

app.get("/sync", requireAuth, async (c) => {
  const data = await read();
  if (!data) {
    c.header("X-Sync-Version", "0");
    return c.json({ version: 0, updatedAt: null, body: null });
  }
  c.header("X-Sync-Version", String(data.version));
  c.header("X-Sync-Updated-At", data.updatedAt);
  return c.json(data);
});

app.put("/sync", requireAuth, async (c) => {
  const header = c.req.header("x-expected-version");
  if (header === undefined) {
    return c.json({ error: "missing_x_expected_version" }, 400);
  }
  const expectedVersion = Number(header);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return c.json({ error: "invalid_x_expected_version" }, 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json_body" }, 400);
  }

  const result = await write(body, expectedVersion);
  if (!result.ok) {
    c.header("X-Sync-Version", String(result.currentVersion));
    return c.json(
      { error: "version_conflict", currentVersion: result.currentVersion },
      409,
    );
  }
  c.header("X-Sync-Version", String(result.data.version));
  c.header("X-Sync-Updated-At", result.data.updatedAt);
  return c.json({
    ok: true,
    version: result.data.version,
    updatedAt: result.data.updatedAt,
  });
});

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error("unhandled error:", err);
  return c.json({ error: "internal_error" }, 500);
});

const server = serve({
  fetch: app.fetch,
  port: PORT,
  hostname: "127.0.0.1",
});

console.log(`wheelhouse-sync listening on http://127.0.0.1:${PORT}`);
console.log(`allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down…`);
  server.close(() => process.exit(0));
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
