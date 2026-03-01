export interface UserStatus {
  wallet: string;
  mode: "MODE_CLEAN" | "MODE_GAMING";
  modeReason: string;
  pauseState: boolean;
  maxAmountTon: string;
  score: string;
  level: "BRONZE" | "SILVER" | "GOLD";
  balanceTon?: string;
  claimableTon?: string;
  contractAddress?: string;
  contract?: {
    paused: boolean;
    minAmountTon: string;
    reserveFloorTon: string;
    roundSeq: string;
    lastRoll: number;
    lastResult: number;
    lastCreditTon: string;
  };
  rateLimit: {
    windowSec: number;
    maxRequests: number;
  };
}

const API_BASE =
  import.meta.env.DEV && typeof window !== "undefined"
    ? window.location.origin
    : (import.meta.env.VITE_API_BASE ?? "http://localhost:3001");

// ---------------------------------------------------------------------------
// DEV MOCK — set VITE_DEV_MOCK=true in frontend/.env to bypass real network
// ---------------------------------------------------------------------------
const DEV_MOCK = import.meta.env.VITE_DEV_MOCK === "true";
export const DEV_MOCK_WALLET = DEV_MOCK
  ? "UQB3J9IorzTiB6Uo17hzalUy_DcLcRZIpy6hww966Ziki5r8"
  : "";

const DEV_MOCK_STATUS: UserStatus = {
  wallet: "UQB3J9IorzTiB6Uo17hzalUy_DcLcRZIpy6hww966Ziki5r8",
  mode: "MODE_GAMING",
  modeReason: "dev mock",
  pauseState: false,
  maxAmountTon: "5.0000",
  score: "0.0000",
  level: "BRONZE",
  balanceTon: "10.0000",
  claimableTon: "0.0000",
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS ?? "",
  contract: {
    paused: false,
    minAmountTon: "0.1000",
    reserveFloorTon: "1000.0000",
    roundSeq: "0",
    lastRoll: 0,
    lastResult: 0,
    lastCreditTon: "0.0000"
  },
  rateLimit: { windowSec: 10, maxRequests: 100 }
};

async function checkRes(res: Response, context: string, url: string): Promise<void> {
  if (res.ok) return;
  const status = res.status;
  const text = await res.text();
  if (status === 502 || status === 503) {
    throw new Error(`接口暂时不可用(${status})。请确认后端服务已启动，若使用 nginx 请检查上游是否运行。`);
  }
  throw new Error(`${context} 失败: ${status}${text ? ` - ${text.slice(0, 200)}` : ""}`);
}

export async function fetchUserStatus(wallet = ""): Promise<UserStatus> {
  if (DEV_MOCK) return { ...DEV_MOCK_STATUS, wallet: wallet || DEV_MOCK_STATUS.wallet };
  const url = new URL("/api/user/status", API_BASE);
  if (wallet) {
    url.searchParams.set("wallet", wallet);
  }
  const urlStr = url.toString();
  let res: Response;
  try {
    res = await fetch(urlStr);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "网络错误";
    throw new Error(
      `无法连接后端: ${msg}。请确认：1) 后端已启动 (npm run dev:backend)；2) 地址正确：${urlStr}`
    );
  }
  await checkRes(res, "获取用户状态", urlStr);
  const status = JSON.parse(await res.text()) as UserStatus;
  
  // Mark restricted region for locale detection
  if (status.mode === "MODE_CLEAN") {
    sessionStorage.setItem("is_restricted_region", "true");
  } else {
    sessionStorage.removeItem("is_restricted_region");
  }
  
  return status;
}

export interface SubmitRoundParams {
  wallet: string;
  direction: 0 | 1;
  threshold: number;
  amountNano: string;
  roll: number;
  result: 0 | 1;
  payoutNano: string;
  rebateNano: string;
}

export async function submitRound(params: SubmitRoundParams): Promise<void> {
  if (!DEV_MOCK) return; // only used in mock mode
  try {
    await fetch(`${API_BASE}/api/rounds/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params)
    });
  } catch {
    // non-critical, ignore
  }
}

export async function submitScore(wallet: string, txHash: string, network: "mainnet" = "mainnet"): Promise<{ ok: boolean; status: string }> {
  const res = await fetch(`${API_BASE}/api/score/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-wallet": wallet
    },
    body: JSON.stringify({ wallet, txHash, network })
  });
  await checkRes(res, "提交交易", `${API_BASE}/api/score/submit`);
  return JSON.parse(await res.text()) as Promise<{ ok: boolean; status: string }>;
}

export interface RecentTx {
  hash: string;
  lt?: number;
  utime?: number;
}

export async function fetchRecentTransactions(contract: string, wallet: string): Promise<{ transactions: RecentTx[] }> {
  const url = new URL("/api/transactions/recent", API_BASE);
  url.searchParams.set("contract", contract);
  url.searchParams.set("wallet", wallet);
  const res = await fetch(url.toString());
  await checkRes(res, "获取最近交易", url.toString());
  return res.json() as Promise<{ transactions: RecentTx[] }>;
}

const PAGE_SIZE = 20;

export interface RoundItem {
  roundId: string;
  wallet: string;
  walletRaw?: string;
  win: boolean;
  amountTon: string;
  payoutTon: string;
  lossTon: string;
  createdAt: string;
}

export async function fetchMyRounds(
  wallet: string,
  cursor?: string | null
): Promise<{ items: RoundItem[]; nextCursor: string | null }> {
  const url = new URL("/api/rounds/my", API_BASE);
  url.searchParams.set("wallet", wallet);
  url.searchParams.set("limit", String(PAGE_SIZE));
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await fetch(url.toString());
  await checkRes(res, "我的记录", url.toString());
  return res.json() as Promise<{ items: RoundItem[]; nextCursor: string | null }>;
}

export async function fetchRecentRounds(
  cursor?: string | null
): Promise<{ items: RoundItem[]; nextCursor: string | null }> {
  const url = new URL("/api/rounds/recent", API_BASE);
  url.searchParams.set("limit", String(PAGE_SIZE));
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await fetch(url.toString());
  await checkRes(res, "最近对局", url.toString());
  return res.json() as Promise<{ items: RoundItem[]; nextCursor: string | null }>;
}

export interface WonLeaderboardItem {
  rank: number;
  wallet: string;
  walletRaw?: string;
  wonTon: string; // 总额（win 的赔付 + lose 的投注），字段名保持兼容
}

export async function fetchWonLeaderboard(
  cursor?: string | null
): Promise<{ items: WonLeaderboardItem[]; nextCursor: string | null }> {
  const url = new URL("/api/leaderboard/won", API_BASE);
  url.searchParams.set("limit", String(PAGE_SIZE));
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await fetch(url.toString());
  await checkRes(res, "总额榜", url.toString());
  return res.json() as Promise<{ items: WonLeaderboardItem[]; nextCursor: string | null }>;
}
