export type Mode = "MODE_CLEAN" | "MODE_GAMING";

export interface UserStatus {
  wallet: string;
  mode: Mode;
  modeReason: string;
  pauseState: boolean;
  maxAmountTon: string;
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
