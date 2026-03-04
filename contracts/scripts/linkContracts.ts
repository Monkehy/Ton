/**
 * 关联合约脚本 - 发送 SetGameContract 消息给 DepositVault 和 PrizePool
 *
 * 使用方法（需要 toncenter API key，免费注册 @tonapibot）：
 * NETWORK=testnet MNEMONIC="your 24 words" TONCENTER_API_KEY="xxx" npx ts-node scripts/linkContracts.ts
 */

import { Address, toNano, beginCell, TonClient, WalletContractV4, WalletContractV3R2, WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { mnemonicToPrivateKey, mnemonicToWalletKey, KeyPair } from "@ton/crypto";

// ── 已部署的合约地址 ───────────────────────────────────────────
const CONTRACTS = {
  depositVault: "EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P",
  prizePool:    "EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS",
  diceGameV2:   "EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut",
};

const OP_SET_GAME_CONTRACT = 2882474885;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const network = process.env.NETWORK ?? "testnet";
  const mnemonicStr = process.env.MNEMONIC ?? "";
  const apiKey = process.env.TONCENTER_API_KEY ?? "";

  if (!mnemonicStr) {
    console.error("❌ Please provide MNEMONIC env variable");
    process.exit(1);
  }
  if (!apiKey) {
    console.warn("⚠️  No TONCENTER_API_KEY provided - may hit rate limits");
    console.warn("   Get a free key from @tonapibot on Telegram");
  }

  const endpoint = network === "mainnet"
    ? "https://toncenter.com/api/v2/jsonRPC"
    : "https://testnet.toncenter.com/api/v2/jsonRPC";

  // Use provided API key, or fall back to no key (lower rate limit)
  const client = new TonClient({ endpoint, apiKey: apiKey || undefined });

  // Retry helper for 429 rate limit errors
  async function withRetry<T>(fn: () => Promise<T>, retries = 5, delayMs = 3000): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (e: unknown) {
        const isRateLimit = e instanceof Error && (
          e.message.includes("429") ||
          (e as { response?: { status?: number } }).response?.status === 429
        );
        if (isRateLimit && i < retries - 1) {
          console.log(`   Rate limited, retrying in ${delayMs / 1000}s... (${i + 1}/${retries})`);
          await sleep(delayMs);
          delayMs *= 2;
        } else {
          throw e;
        }
      }
    }
    throw new Error("Max retries exceeded");
  }
  const mnemonic = mnemonicStr.trim().split(/\s+/);
  const kpDirect    = await mnemonicToPrivateKey(mnemonic);
  const kpTonkeeper = await mnemonicToWalletKey(mnemonic);

  // Find which derivation + version matches the owner address
  const OWNER = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";
  const candidates = [
    { name: "v5r1/tonkeeper", kp: kpTonkeeper, contract: WalletContractV5R1.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) },
    { name: "v5r1/direct",    kp: kpDirect,    contract: WalletContractV5R1.create({ publicKey: kpDirect.publicKey,    workchain: 0 }) },
    { name: "v4r2/tonkeeper", kp: kpTonkeeper, contract: WalletContractV4.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) },
    { name: "v4r2/direct",    kp: kpDirect,    contract: WalletContractV4.create({ publicKey: kpDirect.publicKey, workchain: 0 }) },
    { name: "v3r2/tonkeeper", kp: kpTonkeeper, contract: WalletContractV3R2.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) },
    { name: "v3r2/direct",    kp: kpDirect,    contract: WalletContractV3R2.create({ publicKey: kpDirect.publicKey, workchain: 0 }) },
  ];

  let selectedKp = kpDirect;
  let walletContract: WalletContractV5R1 | WalletContractV4 | WalletContractV3R2 = candidates[0].contract;
  let matchedName = candidates[0].name;
  console.log("\n🔍 Finding matching wallet version...");
  for (const { name, kp, contract } of candidates) {
    const addr = contract.address.toString({ bounceable: false, testOnly: true });
    console.log(`   [${name}]: ${addr}`);
    if (addr === OWNER) {
      selectedKp = kp;
      walletContract = contract;
      matchedName = name;
      console.log(`   ✅ Matched!`);
      break;
    }
  }
  console.log(`\n📌 Using: ${matchedName}`);

  const keyPair = selectedKp;
  const wallet = client.open(walletContract);

  // 统一发送函数，兼容 V5R1 / V4 / V3R2
  async function sendMsg(seqno: number, body: import("@ton/core").Cell, to: Address) {
    const msg = internal({ to, value: toNano("0.05"), body });
    if (walletContract instanceof WalletContractV5R1) {
      await (wallet as ReturnType<typeof client.open<WalletContractV5R1>>).sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        messages: [msg],
      });
    } else {
      await (wallet as ReturnType<typeof client.open<WalletContractV4>>).sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [msg],
      });
    }
  }

  console.log(`🔑 Wallet: ${walletContract.address.toString()}`);
  console.log(`🌐 Network: ${network}`);

  // Check wallet status first
  try {
    const balance = await withRetry(() => client.getBalance(walletContract.address));
    console.log(`💰 Wallet balance: ${Number(balance) / 1e9} TON`);
    if (balance < toNano("0.15")) {
      console.error("❌ Insufficient balance! Need at least 0.15 TON for gas.");
      console.error(`   Get testnet TON from: https://t.me/testgiver_ton_bot`);
      process.exit(1);
    }
    console.log("✅ Balance OK, proceeding...");
  } catch (e) {
    console.error("❌ Cannot read wallet state:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const setGameContractBody = beginCell()
    .storeUint(OP_SET_GAME_CONTRACT, 32)
    .storeAddress(Address.parse(CONTRACTS.diceGameV2))
    .endCell();

  // ── Send to DepositVault ──────────────────────────────────────
  console.log("\n📤 [1/2] Sending SetGameContract to DepositVault...");
  const seqno1 = await withRetry(() => wallet.getSeqno());
  await withRetry(() => sendMsg(seqno1, setGameContractBody, Address.parse(CONTRACTS.depositVault)));
  console.log("   ✅ Sent! Waiting 20s for confirmation...");
  await sleep(20000);

  // ── Send to PrizePool ─────────────────────────────────────────
  console.log("📤 [2/2] Sending SetGameContract to PrizePool...");
  const seqno2 = await withRetry(() => wallet.getSeqno());
  await withRetry(() => sendMsg(seqno2, setGameContractBody, Address.parse(CONTRACTS.prizePool)));
  console.log("   ✅ Sent!");

  console.log("\n🎉 Done! Verify on explorer:");
  console.log(`   DepositVault: https://testnet.tonscan.org/address/${CONTRACTS.depositVault}`);
  console.log(`   PrizePool:    https://testnet.tonscan.org/address/${CONTRACTS.prizePool}`);
}

main().catch(console.error);
