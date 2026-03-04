/**
 * 关联合约脚本 - 发送 SetGameContract 消息给 DepositVault 和 PrizePool
 *
 * 使用方法（需要 toncenter API key，免费注册 @tonapibot）：
 * NETWORK=testnet MNEMONIC="your 24 words" TONCENTER_API_KEY="xxx" npx ts-node scripts/linkContracts.ts
 */

import { Address, toNano, beginCell, TonClient, WalletContractV4, internal } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

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
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const walletContract = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
  const wallet = client.open(walletContract);

  console.log(`🔑 Wallet: ${walletContract.address.toString()}`);
  console.log(`🌐 Network: ${network}`);

  const setGameContractBody = beginCell()
    .storeUint(OP_SET_GAME_CONTRACT, 32)
    .storeAddress(Address.parse(CONTRACTS.diceGameV2))
    .endCell();

  // ── Send to DepositVault ──────────────────────────────────────
  console.log("\n📤 [1/2] Sending SetGameContract to DepositVault...");
  const seqno1 = await withRetry(() => wallet.getSeqno());
  await withRetry(() => wallet.sendTransfer({
    seqno: seqno1,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: Address.parse(CONTRACTS.depositVault),
        value: toNano("0.05"),
        body: setGameContractBody,
      }),
    ],
  }));
  console.log("   ✅ Sent! Waiting 20s for confirmation...");
  await sleep(20000);

  // ── Send to PrizePool ─────────────────────────────────────────
  console.log("📤 [2/2] Sending SetGameContract to PrizePool...");
  const seqno2 = await withRetry(() => wallet.getSeqno());
  await withRetry(() => wallet.sendTransfer({
    seqno: seqno2,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: Address.parse(CONTRACTS.prizePool),
        value: toNano("0.05"),
        body: setGameContractBody,
      }),
    ],
  }));
  console.log("   ✅ Sent!");

  console.log("\n🎉 Done! Verify on explorer:");
  console.log(`   DepositVault: https://testnet.tonscan.org/address/${CONTRACTS.depositVault}`);
  console.log(`   PrizePool:    https://testnet.tonscan.org/address/${CONTRACTS.prizePool}`);
}

main().catch(console.error);
