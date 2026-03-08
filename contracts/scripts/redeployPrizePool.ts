/**
 * 仅重新部署 PrizePool 并重新链接所有合约关系
 * 适用于只修改了 PrizePool 合约的情况，其他合约地址不变
 *
 * 使用方法：
 * MNEMONIC="your 24 words" npm run redeploy:prizepool
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

import {
  PrizePool,
  storeFundPrizePool,
  storeSetGameContract as prizePoolStoreSetGameContract,
} from "../build/PrizePool/tact_PrizePool";

import {
  storeSetGameContract as vaultStoreSetGameContract,
  storeSetPrizePool,
} from "../build/DepositVault/tact_DepositVault";

// ═══════════════════════════════════════════════════════════
// 现有合约地址（保持不变）
// ═══════════════════════════════════════════════════════════
const DEPOSIT_VAULT_ADDR = "EQBjKDiTdErhtPSMqLeqUkaxrH78F9XgjNgTSHUeED51Rg5J";
const DICE_GAME_ADDR = "EQDpw7gljveYDi1TKrEky_CynU0FnDE7HlZs_9CTbh9LRn17";
const OWNER_ADDR = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";
const RPC = "https://testnet.toncenter.com/api/v2/jsonRPC";
const INITIAL_FUND = "0.5"; // 注入 PrizePool 的初始资金（TON）

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForSeqnoIncrease(
  wallet: { getSeqno(): Promise<number> },
  expected: number,
  maxMs = 90000
) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await sleep(3000);
    const cur = await wallet.getSeqno().catch(() => expected);
    if (cur > expected) return;
  }
  throw new Error("Seqno 未增加，超时");
}

async function waitActive(client: TonClient, addr: Address, name: string) {
  console.log(`   ⏳ 等待 ${name} 上链...`);
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const state = await client.getContractState(addr).catch(() => null);
    if (state?.state === "active") {
      console.log(`   ✅ ${name} 已激活！`);
      return;
    }
  }
  throw new Error(`${name} 部署超时，请去 explorer 手动确认`);
}

// ═══════════════════════════════════════════════════════════
// 主流程
// ═══════════════════════════════════════════════════════════
async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) throw new Error("请设置 MNEMONIC 环境变量");

  const apiKey = process.env.TONCENTER_API_KEY;
  const client = new TonClient({ endpoint: RPC, apiKey });

  const words = mnemonic.trim().split(/\s+/);

  // 自动检测 W5 / V4 钱包
  const keyPairW5 = await mnemonicToWalletKey(words);
  const walletW5 = WalletContractV5R1.create({
    workchain: 0,
    publicKey: keyPairW5.publicKey,
    walletId: { networkGlobalId: -3 },
  });
  const addrW5 = walletW5.address.toString({ bounceable: false });

  const keyPairV4 = await mnemonicToPrivateKey(words);
  const walletV4 = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPairV4.publicKey,
  });

  let isV5 = addrW5 === OWNER_ADDR || addrW5 === OWNER_ADDR.replace(/^0/, "E");
  let walletAddress: Address;
  let keyPair: { secretKey: Buffer };

  if (isV5) {
    walletAddress = walletW5.address;
    keyPair = keyPairW5;
    console.log(`✅ 使用 W5 钱包: ${addrW5}`);
  } else {
    walletAddress = walletV4.address;
    keyPair = keyPairV4;
    isV5 = false;
    console.log(`✅ 使用 V4 钱包: ${walletV4.address.toString({ bounceable: false })}`);
  }

  const walletContract = isV5 ? client.open(walletW5) : client.open(walletV4);

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
  const diceGameAddress = Address.parse(DICE_GAME_ADDR);

  // 查当前余额
  const balance = await client.getBalance(walletAddress);
  console.log(`💰 钱包余额: ${Number(balance) / 1e9} TON`);
  if (Number(balance) < toNano("1")) {
    throw new Error("余额不足，至少需要 1 TON");
  }

  // ═══════════════════════════════════════════════════════════
  // Step 1: 部署新 PrizePool
  // ═══════════════════════════════════════════════════════════
  console.log("\n📦 [1/5] 部署新 PrizePool...");

  const prizePool = await PrizePool.fromInit(
    walletAddress,
    diceGameAddress,      // gameContract = DiceGameV2
    depositVaultAddress   // depositVault = DepositVault
  );
  const prizePoolAddress = prizePool.address;
  console.log(`   地址: ${prizePoolAddress.toString()}`);

  let seqno = await walletContract.getSeqno();
  await send(seqno, [
    internal({
      to: prizePoolAddress,
      value: toNano("0.1"),
      init: prizePool.init,
      body: beginCell()
        .storeUint(0, 32)
        .storeBuffer(Buffer.from("Deploy"))
        .endCell(),
    }),
  ]);
  await waitForSeqnoIncrease(walletContract, seqno);
  await waitActive(client, prizePoolAddress, "PrizePool");

  // ═══════════════════════════════════════════════════════════
  // Step 2: 注资 PrizePool
  // ═══════════════════════════════════════════════════════════
  console.log(`\n💰 [2/5] 注资 PrizePool ${INITIAL_FUND} TON...`);
  seqno = await walletContract.getSeqno();
  await send(seqno, [
    internal({
      to: prizePoolAddress,
      value: toNano(INITIAL_FUND),
      body: beginCell()
        .store(storeFundPrizePool({ $$type: "FundPrizePool" }))
        .endCell(),
    }),
  ]);
  await waitForSeqnoIncrease(walletContract, seqno);
  console.log("   ✅ 注资完成");

  // ═══════════════════════════════════════════════════════════
  // Step 3: DepositVault.SetGameContract = DiceGameV2
  //         DepositVault.SetPrizePool = 新 PrizePool
  // ═══════════════════════════════════════════════════════════
  console.log("\n🔗 [3/4] 更新 DepositVault 关联关系...");

  // 3a: SetGameContract
  seqno = await walletContract.getSeqno();
  await send(seqno, [
    internal({
      to: depositVaultAddress,
      value: toNano("0.05"),
      body: beginCell()
        .store(
          vaultStoreSetGameContract({
            $$type: "SetGameContract",
            newGameContract: diceGameAddress,
          })
        )
        .endCell(),
    }),
  ]);
  await waitForSeqnoIncrease(walletContract, seqno);
  console.log("   ✅ DepositVault.gameContract = DiceGameV2");

  // 3b: SetPrizePool
  seqno = await walletContract.getSeqno();
  await send(seqno, [
    internal({
      to: depositVaultAddress,
      value: toNano("0.05"),
      body: beginCell()
        .store(
          storeSetPrizePool({
            $$type: "SetPrizePool",
            newPrizePool: prizePoolAddress,
          })
        )
        .endCell(),
    }),
  ]);
  await waitForSeqnoIncrease(walletContract, seqno);
  console.log("   ✅ DepositVault.prizePool = 新 PrizePool");

  // ═══════════════════════════════════════════════════════════
  // Step 4: 输出结果 + 更新 .env 提示
  // ═══════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("🎉 全部完成！请更新以下两个 .env 文件：");
  console.log("═".repeat(60));
  console.log(`\n新 PrizePool 地址:\n  ${prizePoolAddress.toString()}`);
  console.log("\n--- backend/.env ---");
  console.log(`TON_PRIZE_POOL_ADDRESS=${prizePoolAddress.toString()}`);
  console.log("\n--- frontend/.env ---");
  console.log(`VITE_PRIZE_POOL_ADDRESS=${prizePoolAddress.toString()}`);
  console.log("\n更新完后在服务器上执行：");
  console.log("  cd /var/www/ton-dice && git pull && npm run build --workspace=frontend && pm2 restart backend");
}

main().catch(console.error);
