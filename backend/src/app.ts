import cors from "@fastify/cors";
import Fastify from "fastify";
import { rateLimitGuard } from "./plugins/rateLimit.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { referralRoutes } from "./routes/referral.js";
import { roundsRoutes } from "./routes/rounds.js";
import { transactionsRoutes } from "./routes/transactions.js";
import { userRoutes } from "./routes/user.js";
import { gameRoutes } from "./routes/game.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-wallet"]
  });
  app.addHook("preHandler", rateLimitGuard);

  app.get("/health", async () => ({ ok: true }));

  app.register(userRoutes);
  app.register(referralRoutes);
  app.register(transactionsRoutes);
  app.register(roundsRoutes);
  app.register(leaderboardRoutes);
  app.register(gameRoutes);

  return app;
}
