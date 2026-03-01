import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { db } from "../db.js";
import { readContractSnapshot } from "../services/contractReader.js";
import { resolveMode } from "../services/modeService.js";
import type { UserStatus } from "../types.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/user/status", async (request, reply) => {
    try {
      const wallet = typeof request.query === "object" && request.query !== null
        ? ((request.query as Record<string, unknown>).wallet as string | undefined)
        : undefined;

      const { mode, modeReason } = resolveMode(request);
      const pauseState = false;

      if (wallet) {
        await db.query(
          `INSERT INTO users (telegram_id, wallet)
           VALUES ('unknown', $1)
           ON CONFLICT (wallet) DO NOTHING`,
          [wallet]
        );
      }

      const contractSnapshot = await readContractSnapshot(wallet);

      const response: UserStatus = {
        wallet: wallet ?? "",
        mode,
        modeReason,
        pauseState: contractSnapshot?.paused ?? pauseState,
        maxAmountTon: contractSnapshot?.maxAmountTon ?? "0.0000",
        balanceTon: contractSnapshot?.balanceTon,
        claimableTon: contractSnapshot?.claimableTon,
        contractAddress: config.TON_MAINNET_CONTRACT_ADDRESS ?? undefined,
        contract: contractSnapshot
          ? {
              paused: contractSnapshot.paused,
              minAmountTon: contractSnapshot.minAmountTon,
              reserveFloorTon: contractSnapshot.reserveFloorTon,
              roundSeq: contractSnapshot.roundSeq,
              lastRoll: contractSnapshot.lastRoll,
              lastResult: contractSnapshot.lastResult,
              lastCreditTon: contractSnapshot.lastCreditTon
            }
          : undefined,
        rateLimit: {
          windowSec: config.RATE_LIMIT_WINDOW_SEC,
          maxRequests: config.RATE_LIMIT_MAX_REQUESTS
        }
      };

      return response;
    } catch (err) {
      request.log.error(err, "GET /api/user/status failed");
      return reply.status(500).send({
        error: "user_status_error",
        message: err instanceof Error ? err.message : "Internal error"
      });
    }
  });
}
