import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function maskWallet(wallet: string): string {
  if (!wallet || wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

export async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/leaderboard/won", async (request, reply) => {
    const limit = Math.min(Number((request.query as { limit?: string }).limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = (request.query as { cursor?: string }).cursor;
    const cursorRank = cursor ? parseInt(cursor, 10) : 0;
    if (cursor && isNaN(cursorRank)) {
      return reply.status(400).send({ error: "invalid cursor", items: [], nextCursor: null });
    }

    try {
      // 统计每个玩家的总金额（win 赔付 + lose 投注）
      const query = `
        WITH agg AS (
          SELECT 
            wallet, 
            SUM(CASE WHEN result = 1 THEN payout_nano ELSE amount_nano END) AS total_amount
          FROM rounds
          GROUP BY wallet
        ),
        ranked AS (
          SELECT wallet, total_amount::text,
                 RANK() OVER (ORDER BY total_amount DESC NULLS LAST, wallet ASC) AS r
          FROM agg
        )
        SELECT wallet, total_amount AS amount_nano, r AS rank
        FROM ranked
        WHERE r > $1
        ORDER BY r
        LIMIT $2
      `;
      const res = await db.query<{ wallet: string; amount_nano: string; rank: string }>(query, [cursorRank, limit + 1]);
      const rows = res.rows ?? [];
      const hasMore = rows.length > limit;
      const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => {
        const whole = BigInt(r.amount_nano) / 1_000_000_000n;
        const frac = BigInt(r.amount_nano) % 1_000_000_000n;
        const fracStr = frac.toString().padStart(9, "0").slice(0, 4);
        return {
          rank: Number(r.rank),
          wallet: maskWallet(r.wallet),
          walletRaw: r.wallet,
          wonTon: `${whole}.${fracStr}` // 保持字段名兼容前端
        };
      });
      const last = items[items.length - 1];
      const nextCursor = hasMore && last ? String(last.rank) : null;
      return { items, nextCursor };
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: "server_error", items: [], nextCursor: null });
    }
  });
}
