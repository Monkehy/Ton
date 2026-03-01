import { beginCell } from "@ton/core";

// Op codes from DiceGame contract (must match Tact build)
const OP_DEPOSIT = 1243991607;
const OP_PLAY_ROUND = 2234641007;
const OP_WITHDRAW_BALANCE = 3049108610;
const OP_CLAIM = 2619342542;

function toBase64(u: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(u).toString("base64");
  }
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

/** Deposit: empty body with op only. Value = amount to deposit. */
export function buildDepositPayload(): string {
  const cell = beginCell().storeUint(OP_DEPOSIT, 32).endCell();
  return toBase64(cell.toBoc());
}

/**
 * PlayRound from balance: no attached value. amount = stake from balance.
 * direction: 0 = <=T, 1 = >=T; threshold: 2..5; amount in nanoton.
 */
export function buildPlayRoundPayload(
  direction: 0 | 1,
  threshold: number,
  amountNano: bigint,
  clientNonce: number
): string {
  const ref = beginCell().storeInt(BigInt(clientNonce), 257).endCell();
  const cell = beginCell()
    .storeUint(OP_PLAY_ROUND, 32)
    .storeInt(direction, 257)
    .storeInt(threshold, 257)
    .storeInt(amountNano, 257)
    .storeRef(ref)
    .endCell();
  return toBase64(cell.toBoc());
}

/** WithdrawBalance: withdraw unused deposit back to wallet. amount in nanoton. */
export function buildWithdrawBalancePayload(amountNano: bigint): string {
  const cell = beginCell()
    .storeUint(OP_WITHDRAW_BALANCE, 32)
    .storeInt(amountNano, 257)
    .endCell();
  return toBase64(cell.toBoc());
}

/** Claim: withdraw winnings/rebate. amount 0 = claim all. amount in nanoton. */
export function buildClaimPayload(amountNano: bigint): string {
  const cell = beginCell().storeUint(OP_CLAIM, 32).storeInt(amountNano, 257).endCell();
  return toBase64(cell.toBoc());
}
