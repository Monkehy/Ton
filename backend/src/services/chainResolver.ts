import { Cell } from "@ton/core";
import { config } from "../config.js";

const OP_PLAY_ROUND = 2234641007;

export type TxResolveResult =
  | { status: "PENDING" }
  | { status: "REVERTED"; reason: string }
  | { status: "CONFIRMED"; amountNano: bigint };

interface ResolveInput {
  txHash: string;
  createdAt: Date;
  wallet: string;
}

type JsonObject = Record<string, unknown>;

function getPath(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as JsonObject)[key];
  }
  return current;
}

function toBigIntMaybe(value: unknown): bigint | null {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function readStringPath(data: unknown, path: string[]): string | null {
  const value = getPath(data, path);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function resolveMock(input: ResolveInput): TxResolveResult {
  if (input.txHash.startsWith("fail_")) {
    return { status: "REVERTED", reason: "mock revert marker" };
  }

  if (input.txHash.startsWith("ok_")) {
    const maybeAmount = input.txHash.replace("ok_", "");
    const amount = /^\d+$/.test(maybeAmount) ? BigInt(maybeAmount) : config.MOCK_CONFIRMED_AMOUNT_NANO;
    return { status: "CONFIRMED", amountNano: amount };
  }

  const ageMs = Date.now() - input.createdAt.getTime();
  if (ageMs >= config.MOCK_CONFIRM_DELAY_MS) {
    return {
      status: "CONFIRMED",
      amountNano: config.MOCK_CONFIRMED_AMOUNT_NANO
    };
  }

  return { status: "PENDING" };
}

async function resolveTonMainnet(input: ResolveInput): Promise<TxResolveResult> {
  const endpoint = `${config.TONAPI_BASE_URL.replace(/\/$/, "")}/v2/blockchain/transactions/${input.txHash}`;
  const headers: Record<string, string> = {};
  if (config.TONAPI_API_KEY) {
    headers.Authorization = `Bearer ${config.TONAPI_API_KEY}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.TONAPI_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: controller.signal
    });

    // 主网索引延迟或 txHash 无效时，先按待确认处理
    if (res.status === 404 || res.status === 429) {
      return { status: "PENDING" };
    }
    if (!res.ok) {
      return { status: "PENDING" };
    }

    const data = (await res.json()) as unknown;
    const aborted = getPath(data, ["aborted"]);
    if (aborted === true) {
      return { status: "REVERTED", reason: "transaction aborted on chain" };
    }

    const destinationCandidates = [
      readStringPath(data, ["in_msg", "destination", "address"]),
      readStringPath(data, ["in_msg", "destination"]),
      readStringPath(data, ["inMessage", "destination", "address"]),
      readStringPath(data, ["inMessage", "destination"]),
      readStringPath(data, ["account", "address"]),
      readStringPath(data, ["account"])
    ].filter((v): v is string => Boolean(v));

    if (config.TON_MAINNET_CONTRACT_ADDRESS) {
      const expected = norm(config.TON_MAINNET_CONTRACT_ADDRESS);
      const matched = destinationCandidates.some((x) => norm(x) === expected);
      if (!matched) {
        return { status: "REVERTED", reason: "destination contract mismatch" };
      }
    }

    const amountCandidates = [
      getPath(data, ["in_msg", "value"]),
      getPath(data, ["inMessage", "value"]),
      getPath(data, ["value"])
    ];
    let amountNano: bigint | null = null;
    for (const v of amountCandidates) {
      const parsed = toBigIntMaybe(v);
      if (parsed !== null) {
        amountNano = parsed;
        break;
      }
    }

    // Play-from-balance: value is 0, stake amount is in message body (PlayRound.amount)
    if (amountNano === null || amountNano === 0n) {
      const bodyB64 =
        readStringPath(data, ["in_msg", "decoded", "body"]) ??
        readStringPath(data, ["in_msg", "body"]) ??
        getPath(data, ["in_msg", "decoded", "body"]) as string | undefined;
      if (bodyB64 && typeof bodyB64 === "string") {
        try {
          const cell = Cell.fromBase64(bodyB64);
          const slice = cell.beginParse();
          const op = slice.loadUint(32);
          if (op === OP_PLAY_ROUND) {
            slice.loadIntBig(257); // direction
            slice.loadIntBig(257); // threshold
            const amount = slice.loadIntBig(257); // amount
            if (amount > 0n) {
              amountNano = amount;
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    if (amountNano === null) {
      amountNano = 0n;
    }

    return {
      status: "CONFIRMED",
      amountNano
    };
  } catch {
    return { status: "PENDING" };
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveTxStatus(input: ResolveInput): Promise<TxResolveResult> {
  if (config.CHAIN_PROVIDER === "mock") {
    return resolveMock(input);
  }

  if (config.CHAIN_PROVIDER === "ton_mainnet") {
    return resolveTonMainnet(input);
  }

  return { status: "PENDING" };
}
