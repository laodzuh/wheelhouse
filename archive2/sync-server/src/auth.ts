import type { MiddlewareHandler } from "hono";
import { timingSafeEqual } from "node:crypto";

const SECRET = process.env.SYNC_SECRET;

if (!SECRET || SECRET.length < 16) {
  console.error(
    "SYNC_SECRET env var must be set (min 16 chars). Generate with: openssl rand -base64 32",
  );
  process.exit(1);
}

const secretBytes = Buffer.from(SECRET, "utf8");

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "missing_auth" }, 401);
  }
  const tokenBytes = Buffer.from(header.slice("Bearer ".length), "utf8");
  if (
    tokenBytes.length !== secretBytes.length ||
    !timingSafeEqual(tokenBytes, secretBytes)
  ) {
    return c.json({ error: "invalid_auth" }, 401);
  }
  await next();
};
