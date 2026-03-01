import { Address, toNano, beginCell, Dictionary } from "@ton/core";
import { NetworkProvider } from "@ton/blueprint";
import * as fs from "fs";
import * as path from "path";

// Import compiled contracts
import { MultiSigColdWallet } from "../build/MultiSigColdWallet/tact_MultiSigColdWallet";
import { PrizePool } from "../build/PrizePool/tact_PrizePool";
import { DepositVault } from "../build/DepositVault/tact_DepositVault";
import { DiceGameV2 } from "../build/DiceGameV2/tact_DiceGameV2";

/**
 * 一键部署所有合约（V2 架构）
 * 
 * 部署顺序：
 * 1. MultiSigColdWallet（需要手动配置 5 个管理员地址）
 * 2. PrizePool（并充值初始奖池）
 * 3. DepositVault
 * 4. DiceGameV2
 * 5. 更新 PrizePool 的 gameContract 关联
 */

// ═══════════════════════════════════════════════════════════
// 配置区域 - 部署前请修改这些地址
// ═══════════════════════════════════════════════════════════

const MULTISIG_SIGNERS = [
  "EQA...", // Signer 1 地址（请替换）
  "EQB...", // Signer 2 地址（请替换）
  "EQC...", // Signer 3 地址（请替换）
  "EQD...", // Signer 4 地址（请替换）
  "EQE...", // Signer 5 地址（请替换）
];

const INITIAL_PRIZE_POOL_AMOUNT = "1000"; // 初始奖池充值金额（TON）

// ═══════════════════════════════════════════════════════════

interface DeploymentResult {
  multiSigColdWallet: Address;
  prizePool: Address;
  depositVault: Address;
  diceGameV2: Address;
}

export async function run(provider: NetworkProvider) {
  const sender = provider.sender();
  if (!sender.address) {
    throw new Error("Wallet sender address is unavailable");
  }
  
  const senderAddress = sender.address; // Type-safe reference

  provider.ui().write("🚀 Starting V2 architecture deployment...\n");
  provider.ui().write(`Owner address: ${senderAddress.toString()}\n`);

  // Validate signers
  if (MULTISIG_SIGNERS.some(s => s.startsWith("EQ..."))) {
    provider.ui().write("⚠️  Warning: Please configure MULTISIG_SIGNERS addresses in scripts/deployAll.ts\n");
    provider.ui().write("⚠️  Using owner address as fallback for now\n");
  }

  const result: DeploymentResult = {} as DeploymentResult;

  // ═══════════════════════════════════════════════════════════
  // Step 1: Deploy MultiSigColdWallet
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n📦 [1/4] Deploying MultiSigColdWallet...");
  
  // Build signers map
  const signersMap = Dictionary.empty<bigint, Address>();
  MULTISIG_SIGNERS.forEach((addr, idx) => {
    try {
      signersMap.set(BigInt(idx), Address.parse(addr));
    } catch {
      // Use sender address as fallback for invalid addresses
      signersMap.set(BigInt(idx), senderAddress);
    }
  });

  const coldWallet = provider.open(
    await MultiSigColdWallet.fromInit(senderAddress, signersMap)
  );

  await coldWallet.send(
    provider.sender(),
    { value: toNano("0.1") },
    { $$type: "Deploy", queryId: 0n }
  );

  await provider.waitForDeploy(coldWallet.address);
  result.multiSigColdWallet = coldWallet.address;
  provider.ui().write(`✅ MultiSigColdWallet: ${coldWallet.address.toString()}`);

  // ═══════════════════════════════════════════════════════════
  // Step 2: Deploy PrizePool
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n📦 [2/4] Deploying PrizePool...");
  
  // Use sender address temporarily, will update later with DiceGameV2 address
  const prizePool = provider.open(
    await PrizePool.fromInit(senderAddress, senderAddress)
  );

  await prizePool.send(
    provider.sender(),
    { value: toNano("0.1") },
    { $$type: "Deploy", queryId: 0n }
  );

  await provider.waitForDeploy(prizePool.address);
  result.prizePool = prizePool.address;
  provider.ui().write(`✅ PrizePool: ${prizePool.address.toString()}`);

  // Fund initial prize pool
  provider.ui().write(`💰 Funding prize pool with ${INITIAL_PRIZE_POOL_AMOUNT} TON...`);
  
  await prizePool.send(
    provider.sender(),
    { value: toNano(INITIAL_PRIZE_POOL_AMOUNT) },
    { $$type: "FundPrizePool" }
  );
  
  provider.ui().write(`✅ Prize pool funded`);

  // ═══════════════════════════════════════════════════════════
  // Step 3: Deploy DepositVault
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n📦 [3/4] Deploying DepositVault...");
  
  // Use sender address temporarily for gameContract, will be updated to DiceGameV2
  const depositVault = provider.open(
    await DepositVault.fromInit(
      senderAddress,
      senderAddress,
      coldWallet.address
    )
  );

  await depositVault.send(
    provider.sender(),
    { value: toNano("0.1") },
    { $$type: "Deploy", queryId: 0n }
  );

  await provider.waitForDeploy(depositVault.address);
  result.depositVault = depositVault.address;
  provider.ui().write(`✅ DepositVault: ${depositVault.address.toString()}`);

  // ═══════════════════════════════════════════════════════════
  // Step 4: Deploy DiceGameV2
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n📦 [4/4] Deploying DiceGameV2...");
  
  const diceGame = provider.open(
    await DiceGameV2.fromInit(
      senderAddress,
      depositVault.address,
      prizePool.address
    )
  );

  await diceGame.send(
    provider.sender(),
    { value: toNano("0.1") },
    { $$type: "Deploy", queryId: 0n }
  );

  await provider.waitForDeploy(diceGame.address);
  result.diceGameV2 = diceGame.address;
  provider.ui().write(`✅ DiceGameV2: ${diceGame.address.toString()}`);

  // ═══════════════════════════════════════════════════════════
  // Step 5: Update contract associations
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n🔗 [5/5] Updating contract associations...");

  // Update PrizePool's gameContract
  provider.ui().write("   → Setting DiceGameV2 as PrizePool's authorized game contract...");
  await prizePool.send(
    provider.sender(),
    { value: toNano("0.05") },
    {
      $$type: "SetGameContract",
      newGameContract: diceGame.address
    }
  );
  provider.ui().write("   ✅ PrizePool updated");

  // Update DepositVault's gameContract
  provider.ui().write("   → Setting DiceGameV2 as DepositVault's authorized game contract...");
  await depositVault.send(
    provider.sender(),
    { value: toNano("0.05") },
    {
      $$type: "SetGameContract",
      newGameContract: diceGame.address
    }
  );
  provider.ui().write("   ✅ DepositVault updated");

  // ═══════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════

  const deploymentInfo = {
    network: provider.network(),
    timestamp: new Date().toISOString(),
    deployer: senderAddress.toString(),
    contracts: {
      multiSigColdWallet: result.multiSigColdWallet.toString(),
      prizePool: result.prizePool.toString(),
      depositVault: result.depositVault.toString(),
      diceGameV2: result.diceGameV2.toString(),
    },
    config: {
      signers: MULTISIG_SIGNERS,
      initialPrizePool: INITIAL_PRIZE_POOL_AMOUNT,
    },
    postDeploymentSteps: [
      "1. ✅ SetGameContract sent to PrizePool",
      "2. ✅ SetGameContract sent to DepositVault",
      "3. Update frontend .env with new contract addresses",
      "4. Update backend .env with new contract addresses",
      "5. Test deposit → game → withdraw flow"
    ]
  };

  const outputPath = path.join(__dirname, "../deployment-v2.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  // ═══════════════════════════════════════════════════════════
  // Print summary
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n" + "=".repeat(60));
  provider.ui().write("🎉 V2 Architecture Deployment Complete!\n");
  provider.ui().write("Contract Addresses:");
  provider.ui().write(`  MultiSigColdWallet: ${result.multiSigColdWallet.toString()}`);
  provider.ui().write(`  PrizePool:          ${result.prizePool.toString()}`);
  provider.ui().write(`  DepositVault:       ${result.depositVault.toString()}`);
  provider.ui().write(`  DiceGameV2:         ${result.diceGameV2.toString()}`);
  provider.ui().write("\n📄 Deployment info saved to: deployment-v2.json");
  
  provider.ui().write("\n⚠️  Post-Deployment Steps Required:");
  provider.ui().write("  1. Update frontend/backend .env files");
  provider.ui().write("  2. Test the complete flow");
  provider.ui().write("=".repeat(60));

  // Generate .env template
  const envTemplate = `
# V2 Architecture Contract Addresses
# Generated: ${new Date().toISOString()}

# Frontend (.env)
VITE_DEPOSIT_VAULT_ADDRESS=${result.depositVault.toString()}
VITE_PRIZE_POOL_ADDRESS=${result.prizePool.toString()}
VITE_DICE_GAME_V2_ADDRESS=${result.diceGameV2.toString()}
VITE_COLD_WALLET_ADDRESS=${result.multiSigColdWallet.toString()}

# Backend (.env)
DEPOSIT_VAULT_ADDRESS=${result.depositVault.toString()}
PRIZE_POOL_ADDRESS=${result.prizePool.toString()}
DICE_GAME_V2_ADDRESS=${result.diceGameV2.toString()}
COLD_WALLET_ADDRESS=${result.multiSigColdWallet.toString()}
`.trim();

  const envPath = path.join(__dirname, "../deployment-v2.env");
  fs.writeFileSync(envPath, envTemplate);
  
  provider.ui().write(`\n📝 Environment variables template saved to: deployment-v2.env`);
}
