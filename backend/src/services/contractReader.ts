import { Address, TupleBuilder } from "@ton/core";
import { TonClient } from "@ton/ton";
import { config } from "../config.js";

export interface ContractSnapshot {
  paused: boolean;
  minAmountTon: string;
  reserveFloorTon: string;
  maxAmountTon: string;
  balanceTon: string;
  claimableTon: string;
  roundSeq: string;
  lastRoll: number;
  lastResult: number;
  lastCreditTon: string;
}

let tonClient: TonClient | null = null;

function getClient(): TonClient {
  if (!tonClient) {
    tonClient = new TonClient({
      endpoint: config.TON_RPC_ENDPOINT,
      apiKey: config.TON_RPC_API_KEY
    });
  }
  return tonClient;
}

function nanoToTonText(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const whole = abs / 1_000_000_000n;
  const frac = abs % 1_000_000_000n;
  const fracText = frac.toString().padStart(9, "0").slice(0, 4);
  return `${sign}${whole.toString()}.${fracText}`;
}

// Resolve contract addresses based on current network
function getContractAddresses(): { diceGame: string | undefined; depositVault: string | undefined } {
  const isTestnet = config.CHAIN_PROVIDER === "ton_testnet";
  return {
    diceGame: isTestnet
      ? config.TON_TESTNET_CONTRACT_ADDRESS
      : config.TON_MAINNET_CONTRACT_ADDRESS,
    depositVault: config.TON_DEPOSIT_VAULT_ADDRESS
  };
}

export async function readContractSnapshot(wallet?: string): Promise<ContractSnapshot | null> {
  const { diceGame: diceGameAddr, depositVault: depositVaultAddr } = getContractAddresses();

  // Need at least DepositVault to read user balance
  if (!diceGameAddr && !depositVaultAddr) {
    return null;
  }

  try {
    const client = getClient();

    // ── Read DiceGameV2 state ──────────────────────────────────────
    let paused = false;
    let minAmountTon = "0.1000";
    let reserveFloorTon = "0.0000";
    let maxAmountTon = "5.0000";
    let roundSeq = "0";
    let lastRoll = 0;
    let lastResult = 0;
    let lastCreditTon = "0.0000";

    if (diceGameAddr) {
      try {
        const gameAddress = Address.parse(diceGameAddr);
        const [cfgRes, roundRes] = await Promise.all([
          client.runMethod(gameAddress, "config"),
          client.runMethod(gameAddress, "roundState")
        ]);

        const cfg = cfgRes.stack;
        // GameConfig: owner, depositVault, prizePool, paused, emergency, minAmount
        cfg.readAddress();  // owner
        cfg.readAddress();  // depositVault
        cfg.readAddress();  // prizePool
        paused = cfg.readBoolean();
        cfg.readBoolean();  // emergency
        const minAmount = cfg.readBigNumber();
        minAmountTon = nanoToTonText(minAmount);
        maxAmountTon = "5.0000"; // default max bet

        const round = roundRes.stack;
        roundSeq = round.readBigNumber().toString();
        lastRoll = Number(round.readBigNumber());
        lastResult = Number(round.readBigNumber());
        lastCreditTon = nanoToTonText(round.readBigNumber());
      } catch {
        // DiceGame read failed, use defaults
      }
    }

    // ── Read DepositVault user balance ─────────────────────────────
    let balanceTon = "0.0000";
    let claimableTon = "0.0000";

    if (depositVaultAddr && wallet) {
      try {
        const vaultAddress = Address.parse(depositVaultAddr);
        const walletAddr = Address.parse(wallet);
        const tb = new TupleBuilder();
        tb.writeAddress(walletAddr);

        // balanceOf(addr) → Int (user's deposit balance in DepositVault)
        const balanceRes = await client.runMethod(vaultAddress, "balanceOf", tb.build());
        const userBalance = balanceRes.stack.readBigNumber();
        balanceTon = nanoToTonText(userBalance);
        // DepositVault doesn't have separate claimable; winnings go back to balance
        claimableTon = "0.0000";
      } catch {
        balanceTon = "0.0000";
        claimableTon = "0.0000";
      }
    }

    return {
      paused,
      minAmountTon,
      reserveFloorTon,
      maxAmountTon,
      balanceTon,
      claimableTon,
      roundSeq,
      lastRoll,
      lastResult,
      lastCreditTon
    };
  } catch {
    return null;
  }
}
