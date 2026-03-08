/**
 * hotWallet.ts - Backend hot wallet service
 * Sends PlayRound messages on behalf of players.
 */
import { TonClient, WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { mnemonicToWalletKey } from "@ton/crypto";
import { Address, beginCell, toNano } from "@ton/core";
import { config } from "../config.js";

let _client: TonClient | null = null;
function getClient(): TonClient {
  if (!_client) {
    _client = new TonClient({
      endpoint: config.TON_RPC_ENDPOINT,
      apiKey: config.TON_RPC_API_KEY
    });
  }
  return _client;
}

// PlayRound op code from compiled contract
const OP_PLAY_ROUND = 1984116627;

export function buildPlayRoundBody(
  player: Address,
  direction: number,
  threshold: number,
  amountNano: bigint,
  clientNonce: number
) {
  // Layout from tact_DiceGameV2.ts storePlayRound:
  // b_0: op(32) + player(addr) + direction(257) + threshold(257)
  // b_1 (ref): amount(257) + clientNonce(257)
  const b1 = beginCell()
    .storeInt(amountNano, 257)
    .storeInt(BigInt(clientNonce), 257)
    .endCell();
  return beginCell()
    .storeUint(OP_PLAY_ROUND, 32)
    .storeAddress(player)
    .storeInt(direction, 257)
    .storeInt(threshold, 257)
    .storeRef(b1)
    .endCell();
}

export async function sendPlayRound(params: {
  player: string;
  direction: number;
  threshold: number;
  amountNano: bigint;
  diceGameAddress: string;
}): Promise<{ txHash: string }> {
  const mnemonic = config.HOT_WALLET_MNEMONIC;
  if (!mnemonic) throw new Error("HOT_WALLET_MNEMONIC not configured");

  const client = getClient();
  const words = mnemonic.trim().split(/\s+/);
  const kp = await mnemonicToWalletKey(words);

  // W5 with testnet globalId=-3
  const isTestnet = config.CHAIN_PROVIDER === "ton_testnet";
  const walletContract = WalletContractV5R1.create({
    publicKey: kp.publicKey,
    workchain: 0,
    walletId: { networkGlobalId: isTestnet ? -3 : -239 }
  });
  const wallet = client.open(walletContract);

  const playerAddr = Address.parse(params.player);
  const gameAddr = Address.parse(params.diceGameAddress);
  const nonce = Math.floor(Date.now() / 1000);

  const body = buildPlayRoundBody(
    playerAddr,
    params.direction,
    params.threshold,
    params.amountNano,
    nonce
  );

  const seqno = await wallet.getSeqno();
  await wallet.sendTransfer({
    seqno,
    secretKey: kp.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [
      internal({
        to: gameAddr,
        value: toNano("0.08"),
        body
      })
    ]
  });

  // Return a pseudo hash for now (real hash requires polling)
  return { txHash: `${Date.now()}_${seqno}` };
}
