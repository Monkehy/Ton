import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1),
  CHAIN_PROVIDER: z.enum(["mock", "ton_mainnet"]).default("mock"),
  TONAPI_BASE_URL: z.string().default("https://tonapi.io"),
  TONAPI_API_KEY: z.string().optional(),
  TONAPI_TIMEOUT_MS: z.coerce.number().default(8000),
  TON_MAINNET_CONTRACT_ADDRESS: z.string().optional(),
  TON_RPC_ENDPOINT: z.string().default("https://toncenter.com/api/v2/jsonRPC"),
  TON_RPC_API_KEY: z.string().optional(),
  SCORE_CONFIRM_POLL_MS: z.coerce.number().default(5000),
  MOCK_CONFIRM_DELAY_MS: z.coerce.number().default(15000),
  MOCK_CONFIRMED_AMOUNT_NANO: z.coerce.bigint().default(1_000_000_000n),
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().default(10),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(2),
  RESERVE_FLOOR_TON: z.coerce.number().default(1000),
  MIN_AMOUNT_TON: z.coerce.number().default(0.1),
  SAFETY_FACTOR: z.coerce.number().default(0.02)
});

export const config = schema.parse(process.env);
