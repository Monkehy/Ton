import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { sendPlayRound } from "../services/hotWallet.js";
import { validateTelegramInitData } from "../services/validateTelegramInit.js";

const MIN_AMOUNT_NANO = BigInt(Math.round(config.MIN_AMOUNT_TON * 1e9));

export async function gameRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/game/play", async (request, reply) => {
    try {
      const body = request.body as {
        wallet: string;
        direction: number;
        threshold: number;
        amountNano: string;
        initData?: string;  // Telegram initData for auth (optional in testnet)
      };

      // ── Validate input ──────────────────────────────────────────
      if (!body.wallet) {
        return reply.status(400).send({ error: "missing_wallet" });
      }
      const direction = Number(body.direction);
      if (direction !== 0 && direction !== 1) {
        return reply.status(400).send({ error: "invalid_direction" });
      }
      const threshold = Number(body.threshold);
      if (threshold < 1 || threshold > 6) {
        return reply.status(400).send({ error: "invalid_threshold" });
      }
      const amountNano = BigInt(body.amountNano ?? "0");
      if (amountNano < MIN_AMOUNT_NANO) {
        return reply.status(400).send({ error: "amount_too_small", min: MIN_AMOUNT_NANO.toString() });
      }

      // ── Telegram initData validation (skip if no bot token configured) ──
      if (config.TELEGRAM_BOT_TOKEN && body.initData) {
        const valid = validateTelegramInitData(body.initData, config.TELEGRAM_BOT_TOKEN);
        if (!valid) {
          return reply.status(403).send({ error: "invalid_init_data" });
        }
      }

      // ── Get DiceGameV2 address ──────────────────────────────────
      const isTestnet = config.CHAIN_PROVIDER === "ton_testnet";
      const diceGameAddress = isTestnet
        ? config.TON_TESTNET_CONTRACT_ADDRESS
        : config.TON_MAINNET_CONTRACT_ADDRESS;

      if (!diceGameAddress) {
        return reply.status(503).send({ error: "game_contract_not_configured" });
      }

      if (!config.HOT_WALLET_MNEMONIC) {
        return reply.status(503).send({ error: "hot_wallet_not_configured" });
      }

      // ── Send PlayRound via hot wallet ───────────────────────────
      const result = await sendPlayRound({
        player: body.wallet,
        direction,
        threshold,
        amountNano,
        diceGameAddress
      });

      return reply.send({ ok: true, txHash: result.txHash });

    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      app.log.error({ err: e }, "[game/play] error");
      return reply.status(500).send({ error: "play_failed", message: msg });
    }
  });
}
