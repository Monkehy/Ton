import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";

const bucket = new Map<string, number[]>();

function keyOf(request: FastifyRequest): string {
  const walletFromHeader = request.headers["x-wallet"];
  const wallet = typeof walletFromHeader === "string" ? walletFromHeader : request.ip;
  return `${wallet}:${request.url}`;
}

export async function rateLimitGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const now = Date.now();
  const windowMs = config.RATE_LIMIT_WINDOW_SEC * 1000;
  const key = keyOf(request);

  const recent = (bucket.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= config.RATE_LIMIT_MAX_REQUESTS) {
    reply.code(429).send({
      ok: false,
      message: "操作过于频繁，请稍后重试",
      windowSec: config.RATE_LIMIT_WINDOW_SEC,
      maxRequests: config.RATE_LIMIT_MAX_REQUESTS
    });
    return;
  }

  recent.push(now);
  bucket.set(key, recent);
}
