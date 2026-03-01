import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function maskWallet(wallet: string): string {
  if (!wallet || wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function nanoToTon(nano: string | number): string {
  const n = BigInt(nano);
  const whole = n / 1_000_000_000n;
  const frac = n % 1_000_000_000n;
  const fracStr = frac.toString().padStart(9, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}

const submitRoundSchema = z.object({
  wallet: z.string().min(1),
  direction: z.number().int().min(0).max(1),
  threshold: z.number().int().min(2).max(5),
  amountNano: z.string().regex(/^\d+$/),
  roll: z.number().int().min(1).max(6),
  result: z.number().int().min(0).max(1),
  payoutNano: z.string().regex(/^\d+$/).default("0"),
  rebateNano: z.string().regex(/^\d+$/).default("0")
});

export async function roundsRoutes(app: FastifyInstance): Promise<void> {
  // Submit a round record directly (used in dev mock mode / future off-chain flow)
  app.post("/api/rounds/submit", async (request, reply) => {
    const parsed = submitRoundSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: "invalid_params" });
    }
    const d = parsed.data;

    try {
      // Use a pseudo tx_hash so the unique constraint is satisfied
      const pseudoTxHash = `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const res = await db.query<{ id: string }>(
        `INSERT INTO rounds
           (round_id, wallet, direction, threshold, amount_nano, roll, result,
            payout_nano, rebate_nano, tx_hash, chain, status)
         VALUES (
           (SELECT COALESCE(MAX(round_id), 0) + 1 FROM rounds),
           $1, $2, $3, $4, $5, $6, $7, $8, $9, 'ton', 'CONFIRMED'
         )
         RETURNING id`,
        [
          d.wallet, d.direction, d.threshold,
          d.amountNano, d.roll, d.result,
          d.payoutNano, d.rebateNano, pseudoTxHash
        ]
      );

      return { ok: true, id: res.rows[0]?.id };
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ ok: false, error: "server_error" });
    }
  });

  app.get("/api/rounds/my", async (request, reply) => {
    const wallet = (request.query as { wallet?: string }).wallet;
    const limit = Math.min(Number((request.query as { limit?: string }).limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = (request.query as { cursor?: string }).cursor;

    if (!wallet?.trim()) {
      return reply.status(400).send({ error: "wallet required", items: [], nextCursor: null });
    }

    try {
      const params: (string | number)[] = [wallet];
      let paramIdx = 2;
      if (cursor) {
        const [ts, rid] = cursor.split("_");
        if (ts && rid) {
          params.push(Number(ts), rid);
          paramIdx = 4;
        }
      }
      params.push(limit + 1);
      const query = `
        SELECT round_id, wallet, direction, threshold, amount_nano, roll, result, payout_nano, rebate_nano, created_at
        FROM rounds
        WHERE wallet = $1
        ${cursor && params.length >= 4 ? `AND (created_at, round_id) < (to_timestamp($2)::timestamptz, $3::bigint)` : ""}
        ORDER BY created_at DESC, round_id DESC LIMIT $${paramIdx}
      `;
      const res = await db.query<{
        round_id: string;
        wallet: string;
        direction: number;
        threshold: number;
        amount_nano: string;
        roll: number | null;
        result: number;
        payout_nano: string;
        rebate_nano: string;
        created_at: Date;
      }>(query, params);

      const rows = res.rows ?? [];
      const hasMore = rows.length > limit;
      type RoundRow = { round_id: string; wallet: string; direction: number; threshold: number; amount_nano: string; roll: number | null; result: number; payout_nano: string; rebate_nano: string; created_at: Date };
      const items = (hasMore ? rows.slice(0, limit) : rows).map((r: RoundRow) => ({
        roundId: String(r.round_id),
        wallet: maskWallet(r.wallet),
        walletRaw: r.wallet,
        win: r.result === 1,
        amountTon: nanoToTon(r.amount_nano),
        payoutTon: r.result === 1 ? nanoToTon(r.payout_nano) : "0",
        lossTon: r.result === 0 ? nanoToTon(r.amount_nano) : "0",
        createdAt: r.created_at.toISOString()
      }));
      const last = items[items.length - 1];
      const nextCursor = hasMore && last
        ? `${Math.floor(new Date(last.createdAt).getTime() / 1000)}_${last.roundId}`
        : null;

      return { items, nextCursor };
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: "server_error", items: [], nextCursor: null });
    }
  });

  app.get("/api/rounds/recent", async (request, reply) => {
    const limit = Math.min(Number((request.query as { limit?: string }).limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = (request.query as { cursor?: string }).cursor;

    try {
      const params: (string | number)[] = [];
      let limitParam = 1;
      if (cursor) {
        const [ts, rid] = cursor.split("_");
        if (ts && rid) {
          params.push(Number(ts), rid);
          limitParam = 3;
        }
      }
      params.push(limit + 1);
      const query = `
        SELECT round_id, wallet, direction, threshold, amount_nano, roll, result, payout_nano, rebate_nano, created_at
        FROM rounds
        ${cursor && params.length >= 2 ? `WHERE (created_at, round_id) < (to_timestamp($1)::timestamptz, $2::bigint)` : ""}
        ORDER BY created_at DESC, round_id DESC LIMIT $${limitParam}
      `;
      const res = await db.query<{
        round_id: string;
        wallet: string;
        direction: number;
        threshold: number;
        amount_nano: string;
        roll: number | null;
        result: number;
        payout_nano: string;
        rebate_nano: string;
        created_at: Date;
      }>(query, params);

      const rows = res.rows ?? [];
      const hasMore = rows.length > limit;
      type RoundRow2 = { round_id: string; wallet: string; direction: number; threshold: number; amount_nano: string; roll: number | null; result: number; payout_nano: string; rebate_nano: string; created_at: Date };
      const items = (hasMore ? rows.slice(0, limit) : rows).map((r: RoundRow2) => ({
        roundId: String(r.round_id),
        wallet: maskWallet(r.wallet),
        walletRaw: r.wallet,
        win: r.result === 1,
        amountTon: nanoToTon(r.amount_nano),
        payoutTon: r.result === 1 ? nanoToTon(r.payout_nano) : "0",
        lossTon: r.result === 0 ? nanoToTon(r.amount_nano) : "0",
        createdAt: r.created_at.toISOString()
      }));
      const last = items[items.length - 1];
      const nextCursor = hasMore && last
        ? `${Math.floor(new Date(last.createdAt).getTime() / 1000)}_${last.roundId}`
        : null;

      return { items, nextCursor };
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: "server_error", items: [], nextCursor: null });
    }
  });
}
