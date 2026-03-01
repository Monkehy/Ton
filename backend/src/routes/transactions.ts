import type { FastifyInstance } from "fastify";
import { Address } from "@ton/core";
import { config } from "../config.js";

function toRawAddr(s: string): string | null {
  try {
    const a = Address.parse(s);
    return `${a.workChain}:${a.hash.toString("hex")}`;
  } catch {
    return null;
  }
}

export async function transactionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/transactions/recent", async (request, reply) => {
    const contract = typeof request.query === "object" && request.query !== null
      ? (request.query as Record<string, unknown>).contract as string | undefined
      : undefined;
    const wallet = typeof request.query === "object" && request.query !== null
      ? (request.query as Record<string, unknown>).wallet as string | undefined
      : undefined;

    if (!contract?.trim() || !wallet?.trim()) {
      return reply.status(400).send({ error: "contract and wallet query params required" });
    }

    const walletRaw = toRawAddr(wallet);
    if (!walletRaw) {
      return reply.status(400).send({ error: "invalid wallet address", transactions: [] });
    }

    const base = config.TONAPI_BASE_URL.replace(/\/$/, "");
    const url = `${base}/v2/blockchain/accounts/${encodeURIComponent(contract)}/transactions?limit=20`;
    const headers: Record<string, string> = {};
    if (config.TONAPI_API_KEY) {
      headers.Authorization = `Bearer ${config.TONAPI_API_KEY}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.TONAPI_TIMEOUT_MS);
    try {
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        return reply.status(502).send({ error: "upstream error", transactions: [] });
      }
      const data = (await res.json()) as { transactions?: Array<{
        hash: string;
        lt?: number;
        utime?: number;
        in_msg?: { source?: { address?: string } };
      }> };
      const list = data.transactions ?? [];
      const filtered = list.filter((tx) => {
        const src = tx.in_msg?.source?.address;
        if (!src) return false;
        const srcNorm = src.toLowerCase();
        return srcNorm === walletRaw || srcNorm === walletRaw.toLowerCase();
      });
      return { transactions: filtered.map((tx) => ({ hash: tx.hash, lt: tx.lt, utime: tx.utime })) };
    } catch {
      clearTimeout(timer);
      return reply.status(502).send({ error: "upstream error", transactions: [] });
    }
  });
}
