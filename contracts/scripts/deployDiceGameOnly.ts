/**
 * 仅部署 DiceGameV2（其他合约地址不变）
 * 用于只改了 DiceGameV2 代码、降低 gas 等场景。
 *
 * 使用：MNEMONIC="..." TONCENTER_API_KEY="..." HOT_WALLET_ADDRESS="0Q..." npm run deploy:dice-only
 */
import {
  Address,
  toNano,
  beginCell,
  TonClient,
  WalletContractV4,
  WalletContractV5R1,
  internal,
  SendMode,
} from "@ton/ton";
import { mnemonicToPrivateKey, mnemonicToWalletKey } from "@ton/crypto";
import { DiceGameV2 } from "../build/DiceGameV2/tact_DiceGameV2";

const RPC = "https://testnet.toncenter.com/api/v2/jsonRPC";
const OWNER_ADDR = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";
const DEPOSIT_VAULT_ADDR = "EQB-ynBEp-X1xvdu9Plr5LsZToc_ZnxR9aYbwmliGZZzzH7S";
const PRIZE_POOL_ADDR = "EQADwHZO5Jc5RVQ3X8URmyyImcC3HzGETsSdKPa-xjHeymnF";
const HOT_WALLET_DEFAULT = "0QDjrU9_WUsO-6SXJ0ZvYn6RAsUjiH8RbLWfZsKq4E6NoJA7";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForSeqnoIncrease(wallet: { getSeqno(): Promise<number> }, expected: number, maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await sleep(3000);
    const cur = await wallet.getSeqno().catch(() => expected);
    if (cur > expected) return;
  }
  throw new Error("Seqno 未增加，超时");
}

async function waitActive(client: TonClient, addr: Address, name: string) {
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const state = await client.getContractState(addr).catch(() => null);
    if (state?.state === "active") return;
  }
  throw new Error(`${name} 部署超时`);
}

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) throw new Error("请设置 MNEMONIC 环境变量");

  const apiKey = process.env.TONCENTER_API_KEY;
  const client = new TonClient({ endpoint: RPC, apiKey });
  const words = mnemonic.trim().split(/\s+/);

  const keyPairW5 = await mnemonicToWalletKey(words);
  const walletW5 = WalletContractV5R1.create({
    workchain: 0,
    publicKey: keyPairW5.publicKey,
    walletId: { networkGlobalId: -3 },
  });
  const keyPairV4 = await mnemonicToPrivateKey(words);
  const walletV4 = WalletContractV4.create({ workchain: 0, publicKey: keyPairV4.publicKey });

  const ownerAddr = Address.parse(OWNER_ADDR);
  const isV5 = walletW5.address.equals(ownerAddr);
  const walletAddress = isV5 ? walletW5.address : walletV4.address;
  const keyPair = isV5 ? keyPairW5 : keyPairV4;
  const walletContract = isV5 ? client.open(walletW5) : client.open(walletV4);

  console.log(`✅ 使用 ${isV5 ? "W5" : "V4"} 钱包`);

  async function send(seqno: number, msgs: ReturnType<typeof internal>[]) {
    if (isV5) {
      await (walletContract as ReturnType<typeof client.open<WalletContractV5R1>>).sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: msgs,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
      });
    } else {
      await (walletContract as ReturnType<typeof client.open<WalletContractV4>>).sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: msgs,
      });
    }
  }

  const depositVaultAddress = Address.parse(DEPOSIT_VAULT_ADDR);
  const prizePoolAddress = Address.parse(PRIZE_POOL_ADDR);
  const hotWalletAddr = process.env.HOT_WALLET_ADDRESS
    ? Address.parse(process.env.HOT_WALLET_ADDRESS)
    : Address.parse(HOT_WALLET_DEFAULT);

  const balance = await client.getBalance(walletAddress);
  console.log(`💰 钱包余额: ${Number(balance) / 1e9} TON`);
  if (Number(balance) < toNano("0.2")) throw new Error("余额不足，至少 0.2 TON");

  const diceGame = await DiceGameV2.fromInit(walletAddress, depositVaultAddress, prizePoolAddress, hotWalletAddr);
  const diceGameAddress = diceGame.address;

  console.log("\n📦 部署 DiceGameV2...");
  console.log(`   新地址: ${diceGameAddress.toString()}`);

  let seqno = await walletContract.getSeqno();
  await send(seqno, [
    internal({
      to: diceGameAddress,
      value: toNano("0.1"),
      init: diceGame.init,
      body: beginCell().storeUint(0, 32).storeBuffer(Buffer.from("Deploy")).endCell(),
    }),
  ]);
  await waitForSeqnoIncrease(walletContract, seqno);
  await waitActive(client, diceGameAddress, "DiceGameV2");

  console.log("\n" + "═".repeat(60));
  console.log("新 DiceGameV2 地址（请更新 linkContracts.ts 和 .env）：");
  console.log("═".repeat(60));
  console.log(diceGameAddress.toString());
  console.log("\nbackend/.env:");
  console.log(`TON_TESTNET_CONTRACT_ADDRESS=${diceGameAddress.toString()}`);
  console.log("\nfrontend/.env:");
  console.log(`VITE_CONTRACT_ADDRESS=${diceGameAddress.toString()}`);
  console.log(`VITE_DICE_GAME_ADDRESS=${diceGameAddress.toString()}`);
}

main().catch(console.error);
