/**
 * withdrawOldVault.ts
 * 从旧的 DepositVault 合约取回玩家余额
 * 用法：
 *   TONCENTER_API_KEY="key" MNEMONIC="24词" npm run withdraw:old
 */
import { TonClient, WalletContractV5R1, WalletContractV4, internal, SendMode, Address, beginCell } from "@ton/ton";
import { mnemonicToWalletKey, mnemonicToPrivateKey } from "@ton/crypto";

// ── 旧合约地址 ──────────────────────────────────────────────
const OLD_DEPOSIT_VAULT = "EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P";

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || "";
const MNEMONIC          = process.env.MNEMONIC || "";
const NETWORK           = process.env.NETWORK || "testnet";

// WithdrawRequest op code（从旧版本编译产物读取）
const OP_WITHDRAW_REQUEST = 1488609783;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!MNEMONIC) { console.error("❌ Missing MNEMONIC"); process.exit(1); }

  const endpoint = NETWORK === "testnet"
    ? "https://testnet.toncenter.com/api/v2/jsonRPC"
    : "https://toncenter.com/api/v2/jsonRPC";

  const client = new TonClient({ endpoint, apiKey: TONCENTER_API_KEY });

  const kpTonkeeper = await mnemonicToWalletKey(MNEMONIC.trim().split(/\s+/));
  const kpDirect    = await mnemonicToPrivateKey(MNEMONIC.trim().split(/\s+/));

  const walletV5 = WalletContractV5R1.create({
    publicKey: kpTonkeeper.publicKey,
    workchain: 0,
    walletId: { networkGlobalId: -3 },
  });
  const walletV4 = WalletContractV4.create({ publicKey: kpDirect.publicKey, workchain: 0 });

  const balV5 = await client.getBalance(walletV5.address).catch(() => 0n);
  const balV4 = await client.getBalance(walletV4.address).catch(() => 0n);

  let wallet: WalletContractV5R1 | WalletContractV4;
  let kp: { publicKey: Buffer; secretKey: Buffer };
  let isV5: boolean;

  if (balV5 > 0n) {
    wallet = walletV5; kp = kpTonkeeper; isV5 = true;
    console.log("📌 Using v5r1/tonkeeper/testnet");
  } else {
    wallet = walletV4; kp = kpDirect; isV5 = false;
    console.log("📌 Using v4r2/direct");
  }

  const walletAddr = wallet.address.toString({ bounceable: false, testOnly: true });
  console.log(`🔑 Wallet: ${walletAddr}`);

  const w = client.open(wallet as WalletContractV5R1);
  const seqno = await w.getSeqno();

  // WithdrawRequest: 全部取回（amount=0 表示取全部，具体看合约实现）
  // 如果合约要求指定金额，需要填 amountNano
  const body = beginCell()
    .storeUint(OP_WITHDRAW_REQUEST, 32)
    .storeCoins(0n) // 0 = withdraw all
    .endCell();

  const msg = internal({
    to: Address.parse(OLD_DEPOSIT_VAULT),
    value: 200000000n, // 0.2 TON for gas
    body,
  });

  console.log(`📤 Sending WithdrawRequest to old DepositVault...`);
  console.log(`   ${OLD_DEPOSIT_VAULT}`);

  if (isV5) {
    await (w as ReturnType<typeof client.open<WalletContractV5R1>>).sendTransfer({
      seqno, secretKey: kp.secretKey, messages: [msg],
      sendMode: SendMode.PAY_GAS_SEPARATELY,
    });
  } else {
    await (client.open(wallet as WalletContractV4) as ReturnType<typeof client.open<WalletContractV4>>).sendTransfer({
      seqno, secretKey: kp.secretKey, messages: [msg],
    });
  }

  console.log("✅ Sent! Waiting 15s...");
  await sleep(15000);
  console.log("🎉 Done! Check your wallet balance.");
  console.log(`   Explorer: https://testnet.tonscan.org/address/${OLD_DEPOSIT_VAULT}`);
}

main().catch(console.error);
