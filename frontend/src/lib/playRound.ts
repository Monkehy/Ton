import { beginCell } from "@ton/core";

// ─── Op codes (from Tact ABI, multi-contract architecture) ───
// DepositVault messages
const OP_DEPOSIT         = 1243991607;  // Deposit {}
const OP_WITHDRAW_REQUEST = 1488609783; // WithdrawRequest { amount: Int }

// DiceGameV2 messages
const OP_PLAY_ROUND = 2234641007; // PlayRound { direction, threshold, amount, clientNonce }

function toBase64(u: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(u).toString("base64");
  }
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

/**
 * Deposit: send to DepositVault, value = amount to deposit.
 * Empty body, op code only.
 */
export function buildDepositPayload(): string {
  const cell = beginCell().storeUint(OP_DEPOSIT, 32).endCell();
  return toBase64(cell.toBoc());
}

/**
 * PlayRound: send to DiceGameV2, no value attached (balance deducted inside contract).
 * direction: 0 = <=T, 1 = >=T; threshold: 1-6; amount in nanoton.
 */
export function buildPlayRoundPayload(
  direction: 0 | 1,
  threshold: number,
  amountNano: bigint,
  clientNonce: number
): string {
  const cell = beginCell()
    .storeUint(OP_PLAY_ROUND, 32)
    .storeInt(direction, 257)
    .storeInt(threshold, 257)
    .storeInt(amountNano, 257)
    .storeInt(BigInt(clientNonce), 257)
    .endCell();
  return toBase64(cell.toBoc());
}

/**
 * WithdrawRequest: send to DepositVault to withdraw balance back to wallet.
 * amount in nanoton.
 */
export function buildWithdrawBalancePayload(amountNano: bigint): string {
  const cell = beginCell()
    .storeUint(OP_WITHDRAW_REQUEST, 32)
    .storeInt(amountNano, 257)
    .endCell();
  return toBase64(cell.toBoc());
}

// Kept for compatibility (alias)
export const buildClaimPayload = buildWithdrawBalancePayload;
