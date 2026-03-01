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

export async function readContractSnapshot(wallet?: string): Promise<ContractSnapshot | null> {
  if (!config.TON_MAINNET_CONTRACT_ADDRESS) {
    return null;
  }

  try {
    const client = getClient();
    const contractAddr = Address.parse(config.TON_MAINNET_CONTRACT_ADDRESS);
    const [cfgRes, roundRes, balance] = await Promise.all([
      client.runMethod(contractAddr, "config"),
      client.runMethod(contractAddr, "roundState"),
      client.getBalance(contractAddr)
    ]);
    const cfg = cfgRes.stack;
    const round = roundRes.stack;
    const cfgOwner = cfg.readAddress();
    const cfgPaused = cfg.readBoolean();
    const _cfgEmergency = cfg.readBoolean();
    const cfgMinAmount = cfg.readBigNumber();
    const cfgReserveFloor = cfg.readBigNumber();
    const cfgSafetyFactor = cfg.readBigNumber();
    void cfgOwner;
    void cfgSafetyFactor;

    const reserveFloorNano = cfgReserveFloor;
    const availablePool = balance > reserveFloorNano ? balance - reserveFloorNano : 0n;
    const worstLossRate = 96n;
    const safetyFactorPpm = 20000n;
    const maxStakeNano = (availablePool * safetyFactorPpm) / (10000n * worstLossRate);

    const roundSeq = round.readBigNumber();
    const lastRoll = round.readBigNumber();
    const lastResult = round.readBigNumber();
    const lastCredit = round.readBigNumber();

    let balanceUser = 0n;
    let claimable = 0n;
    if (wallet) {
      try {
        const walletAddr = Address.parse(wallet);
        const tb = new TupleBuilder();
        tb.writeAddress(walletAddr);
        const [balanceRes, claimRes] = await Promise.all([
          client.runMethod(contractAddr, "balanceOf", tb.build()),
          client.runMethod(contractAddr, "claimableOf", tb.build())
        ]);
        balanceUser = balanceRes.stack.readBigNumber();
        claimable = claimRes.stack.readBigNumber();
      } catch {
        balanceUser = 0n;
        claimable = 0n;
      }
    }

    return {
      paused: cfgPaused,
      minAmountTon: nanoToTonText(cfgMinAmount),
      reserveFloorTon: nanoToTonText(cfgReserveFloor),
      maxAmountTon: nanoToTonText(maxStakeNano),
      balanceTon: nanoToTonText(balanceUser),
      claimableTon: nanoToTonText(claimable),
      roundSeq: roundSeq.toString(),
      lastRoll: Number(lastRoll),
      lastResult: Number(lastResult),
      lastCreditTon: nanoToTonText(lastCredit)
    };
  } catch {
    return null;
  }
}
