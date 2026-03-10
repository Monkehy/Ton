/**
 * 重新部署 DepositVault（使用当前助记词作为 owner）
 * 部署完成后同时更新 gameContract / prizePool 关联
 */
import {
  Address, toNano, beginCell,
  TonClient, WalletContractV5R1, internal, SendMode,
} from "@ton/ton";
import { mnemonicToWalletKey } from "@ton/crypto";
import { DepositVault, storeSetGameContract, storeSetPrizePool } from "../build/DepositVault/tact_DepositVault";
import { PrizePool, storeSetDepositVault } from "../build/PrizePool/tact_PrizePool";

const RPC            = "https://testnet.toncenter.com/api/v2/jsonRPC";
const COLD_WALLET    = "EQD_18_1r54BdkGo40ajmhKpWCqDRUSrAqtV1yZSLEzC2CPQ";
const DICE_GAME      = "EQBV2GS_oOmdHsSf0PXK_OcL469KjEiWuU38XBXwmhudkHe5";
const PRIZE_POOL     = "EQADwHZO5Jc5RVQ3X8URmyyImcC3HzGETsSdKPa-xjHeymnF";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function waitSeqno(wallet: { getSeqno(): Promise<number> }, expected: number) {
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const cur = await wallet.getSeqno().catch(() => expected);
    if (cur > expected) return;
  }
  throw new Error("seqno 未增加，超时");
}

async function waitActive(client: TonClient, addr: Address, name: string) {
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const state = await client.getContractState(addr).catch(() => null);
    if (state?.state === "active") { console.log(`   ✅ ${name} 已激活`); return; }
  }
  throw new Error(`${name} 部署超时`);
}

async function main() {
  const raw = process.env.MNEMONIC ?? "";
  if (!raw) throw new Error("❌ 请提供 MNEMONIC 环境变量");
  const mnemonic = raw.trim().split(/\s+/);
  const apiKey   = process.env.TONCENTER_API_KEY;

  const kp     = await mnemonicToWalletKey(mnemonic);
  const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: kp.publicKey, walletId: { networkGlobalId: -3 } });
  const client = new TonClient({ endpoint: RPC, apiKey });
  const wc     = client.open(wallet);

  const ownerAddr     = wallet.address;
  const coldAddr      = Address.parse(COLD_WALLET);
  const diceAddr      = Address.parse(DICE_GAME);
  const prizeAddr     = Address.parse(PRIZE_POOL);

  console.log(`🔑 Owner (W5/testnet): ${ownerAddr.toString({ bounceable: true, testOnly: false })}`);
  const bal = await client.getBalance(ownerAddr);
  console.log(`💰 余额: ${Number(bal) / 1e9} TON`);
  if (Number(bal) < toNano("0.3")) throw new Error("余额不足，至少 0.3 TON");

  // ── [1] 部署 DepositVault ──────────────────────────────────
  // fromInit(owner, gameContract, coldWallet, prizePool)
  // gameContract 先传 owner，稍后用 SetGameContract 更新
  const vault = await DepositVault.fromInit(ownerAddr, ownerAddr, coldAddr, ownerAddr);
  const vaultAddr = vault.address;
  console.log(`\n📦 新 DepositVault 地址: ${vaultAddr.toString({ bounceable: true, testOnly: false })}`);

  let seqno = await wc.getSeqno();
  await wc.sendTransfer({
    seqno, secretKey: kp.secretKey, sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({
      to: vaultAddr, value: toNano("0.1"), init: vault.init,
      body: beginCell().storeUint(0, 32).storeBuffer(Buffer.from("Deploy")).endCell(),
    })],
  });
  await waitSeqno(wc, seqno);
  await waitActive(client, vaultAddr, "DepositVault");

  // ── [2] SetGameContract → DepositVault ────────────────────
  console.log("\n📤 [2/4] SetGameContract → DepositVault...");
  seqno = await wc.getSeqno();
  await wc.sendTransfer({
    seqno, secretKey: kp.secretKey, sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({
      to: vaultAddr, value: toNano("0.05"),
      body: beginCell().store(storeSetGameContract({ $$type: "SetGameContract", newGameContract: diceAddr })).endCell(),
    })],
  });
  await waitSeqno(wc, seqno);
  console.log("   ✅ 完成，等待 15s...");
  await sleep(15000);

  // ── [3] SetPrizePool → DepositVault ───────────────────────
  console.log("📤 [3/4] SetPrizePool → DepositVault...");
  seqno = await wc.getSeqno();
  await wc.sendTransfer({
    seqno, secretKey: kp.secretKey, sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({
      to: vaultAddr, value: toNano("0.05"),
      body: beginCell().store(storeSetPrizePool({ $$type: "SetPrizePool", newPrizePool: prizeAddr })).endCell(),
    })],
  });
  await waitSeqno(wc, seqno);
  console.log("   ✅ 完成，等待 15s...");
  await sleep(15000);

  // ── [4] SetDepositVault → PrizePool ───────────────────────
  console.log("📤 [4/4] SetDepositVault → PrizePool...");
  seqno = await wc.getSeqno();
  await wc.sendTransfer({
    seqno, secretKey: kp.secretKey, sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({
      to: prizeAddr, value: toNano("0.05"),
      body: beginCell().store(storeSetDepositVault({ $$type: "SetDepositVault", newDepositVault: vaultAddr })).endCell(),
    })],
  });
  await waitSeqno(wc, seqno);
  console.log("   ✅ 完成！");

  const addrStr = vaultAddr.toString({ bounceable: true, testOnly: false });
  console.log("\n" + "═".repeat(60));
  console.log("✅ 新 DepositVault 部署 + Link 完成！");
  console.log("═".repeat(60));
  console.log("\n请更新以下配置：");
  console.log("\nbackend/.env:");
  console.log(`TON_DEPOSIT_VAULT_ADDRESS=${addrStr}`);
  console.log("\nfrontend/.env:");
  console.log(`VITE_DEPOSIT_VAULT_ADDRESS=${addrStr}`);
  console.log("\nlinkContracts.ts CONTRACTS.depositVault:");
  console.log(`  depositVault: "${addrStr}",`);
}

main().catch(e => { console.error(e); process.exit(1); });
