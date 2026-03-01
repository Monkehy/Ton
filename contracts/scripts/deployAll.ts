import { Address, toNano, beginCell, Dictionary } from "@ton/core";
import { NetworkProvider } from "@ton/blueprint";
import * as fs from "fs";
import * as path from "path";

// Import compiled contracts
import { MultiSigColdWallet } from "../../build/MultiSigColdWallet/tact_MultiSigColdWallet";
import { PrizePool } from "../../build/PrizePool/tact_PrizePool";
import { DepositVault } from "../../build/DepositVault/tact_DepositVault";
import { DiceGameV2 } from "../../build/DiceGameV2/tact_DiceGameV2";

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

// Testnet 配置（用于测试环境）
const TESTNET_CONFIG = {
  multiSigSigners: [
    "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns", // Testnet Signer 1（请替换为真实 testnet 地址）
    "0QBiscsb5FcPiejE83xO_QsdF2ODzT8d-KlIFyChNlcBVohJ", // Testnet Signer 2（请替换为真实 testnet 地址）
    "0QBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJdVe", // Testnet Signer 3（请替换为真实 testnet 地址）
  ],
  initialPrizePoolAmount: "0.1", // Testnet 初始奖池金额（TON）- 降低到 0.1 TON 节省测试币
};

// Mainnet 配置（用于生产环境）
const MAINNET_CONFIG = {
  multiSigSigners: [
    "UQB3J9IorzTiB6Uo17hzalUy_DcLcRZIpy6hww966Ziki5r8", // Mainnet Signer 1
    "UQBPJkd3EkvdvyTwZPFGC6NpSRCsR4w0FXN4mG73emg1W8LW", // Mainnet Signer 2
    "UQAN07UF1TK49WOSgdBAFLj_VsLq14uD6v4MhJiW0wtW2nMl", // Mainnet Signer 3
  ],
  initialPrizePoolAmount: "1", // Mainnet 初始奖池金额（TON）- 测试阶段使用 1 TON
};

// ═══════════════════════════════════════════════════════════

interface DeploymentResult {
  multiSigColdWallet: Address;
  prizePool: Address;
  depositVault: Address;
  diceGameV2: Address;
}

// Helper function to wait for deploy with better error handling
async function waitForDeployWithRetry(
  provider: NetworkProvider,
  address: Address,
  contractName: string
): Promise<void> {
  const maxRetries = 5; // 增加到 5 次重试
  let lastError: Error | undefined;

  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      if (retry > 0) {
        provider.ui().write(`   Retry ${retry}/${maxRetries - 1}...`);
      }
      // 增加超时时间：40 次检查，每次间隔 10 秒 = 最多 400 秒
      await provider.waitForDeploy(address, 40, 10000);
      return; // Success
    } catch (error) {
      lastError = error as Error;
      if (retry < maxRetries - 1) {
        provider.ui().write(`   Network timeout, retrying...`);
        // Wait 5 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to deploy ${contractName} after ${maxRetries} attempts. ` +
    `Last error: ${lastError?.message}. ` +
    `⚠️  合约可能已经部署成功，请访问浏览器确认：\n` +
    `   https://testnet.tonscan.org/address/${address.toString()}\n` +
    `   如果合约状态为 Active，说明部署成功，可以继续部署下一个合约。`
  );
}

export async function run(provider: NetworkProvider) {
  const sender = provider.sender();
  if (!sender.address) {
    throw new Error("Wallet sender address is unavailable");
  }
  
  const senderAddress = sender.address; // Type-safe reference

  // 检测网络环境并选择配置
  const isTestnet = provider.network() === "testnet";
  const config = isTestnet ? TESTNET_CONFIG : MAINNET_CONFIG;
  const networkName = isTestnet ? "TESTNET" : "MAINNET";

  provider.ui().write(`🚀 Starting V2 architecture deployment on ${networkName}...\n`);
  provider.ui().write(`Owner address: ${senderAddress.toString()}\n`);
  provider.ui().write(`Initial Prize Pool: ${config.initialPrizePoolAmount} TON\n\n`);

  // Validate signers
  const hasInvalidSigners = config.multiSigSigners.some(s => 
    s.includes("Test") || s.includes("AAA") || s.includes("...")
  );
  
  if (hasInvalidSigners) {
    provider.ui().write(`⚠️  WARNING: Please configure valid ${networkName} addresses in scripts/deployAll.ts\n`);
    provider.ui().write(`⚠️  Current signers look like placeholders!\n`);
    
    const shouldContinue = await provider.ui().input(
      "Do you want to continue with these addresses? (yes/no): "
    );
    
    if (shouldContinue.toLowerCase() !== "yes") {
      provider.ui().write("\n❌ Deployment cancelled. Please update the addresses first.\n");
      return;
    }
  }

  const result: DeploymentResult = {} as DeploymentResult;

  // ═══════════════════════════════════════════════════════════
  // Step 1: Deploy MultiSigColdWallet
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n📦 [1/4] Deploying MultiSigColdWallet...");
  
  // 检查是否已部署
  const skipMultiSig = await provider.ui().input("已有 MultiSigColdWallet 地址吗？(yes/no, 默认 no): ");
  let coldWalletAddress: Address;
  
  if (skipMultiSig.toLowerCase() === "yes") {
    const existingAddr = await provider.ui().input("请输入已部署的 MultiSigColdWallet 地址: ");
    coldWalletAddress = Address.parse(existingAddr.trim());
    provider.ui().write(`✅ 使用现有 MultiSigColdWallet: ${coldWalletAddress.toString()}`);
  } else {
    provider.ui().write("   Sending deployment transaction...");
    
    // Build signers map
    const signersMap = Dictionary.empty<bigint, Address>();
    config.multiSigSigners.forEach((addr, idx) => {
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

    provider.ui().write("   Waiting for contract to deploy (this may take 30-60s on testnet)...");
    await waitForDeployWithRetry(provider, coldWallet.address, "MultiSigColdWallet");
    coldWalletAddress = coldWallet.address;
    provider.ui().write(`✅ MultiSigColdWallet: ${coldWalletAddress.toString()}`);
  }
  
  result.multiSigColdWallet = coldWalletAddress;

  // ═══════════════════════════════════════════════════════════
  // Step 2: Deploy PrizePool
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n📦 [2/4] Deploying PrizePool...");
  
  // 检查是否已部署
  const skipPrizePool = await provider.ui().input("已有 PrizePool 地址吗？(yes/no, 默认 no): ");
  let prizePoolAddress: Address;
  
  if (skipPrizePool.toLowerCase() === "yes") {
    const existingAddr = await provider.ui().input("请输入已部署的 PrizePool 地址: ");
    prizePoolAddress = Address.parse(existingAddr.trim());
    provider.ui().write(`✅ 使用现有 PrizePool: ${prizePoolAddress.toString()}`);
  } else {
    provider.ui().write("   Sending deployment transaction...");
    
    // 使用已部署的 coldWalletAddress
    const prizePool = provider.open(
      await PrizePool.fromInit(senderAddress, coldWalletAddress)
    );

    await prizePool.send(
      provider.sender(),
      { value: toNano("0.1") },
      { $$type: "Deploy", queryId: 0n }
    );

    provider.ui().write("   Waiting for contract to deploy...");
    await waitForDeployWithRetry(provider, prizePool.address, "PrizePool");
    prizePoolAddress = prizePool.address;
    provider.ui().write(`✅ PrizePool: ${prizePoolAddress.toString()}`);

    // Fund initial prize pool
    provider.ui().write(`💰 Funding prize pool with ${config.initialPrizePoolAmount} TON...`);
    
    await prizePool.send(
      provider.sender(),
      { value: toNano(config.initialPrizePoolAmount) },
      { $$type: "FundPrizePool" }
    );
    
    provider.ui().write(`✅ Prize pool funded`);
  }
  
  result.prizePool = prizePoolAddress;

  // ═══════════════════════════════════════════════════════════
  // Step 3: Deploy DepositVault
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n📦 [3/4] Deploying DepositVault...");
  
  // 检查是否已部署
  const skipDepositVault = await provider.ui().input("已有 DepositVault 地址吗？(yes/no, 默认 no): ");
  let depositVaultAddress: Address;
  
  if (skipDepositVault.toLowerCase() === "yes") {
    const existingAddr = await provider.ui().input("请输入已部署的 DepositVault 地址: ");
    depositVaultAddress = Address.parse(existingAddr.trim());
    provider.ui().write(`✅ 使用现有 DepositVault: ${depositVaultAddress.toString()}`);
  } else {
    provider.ui().write("   Sending deployment transaction...");
    
    // Use sender address temporarily for gameContract, will be updated to DiceGameV2
    const depositVault = provider.open(
      await DepositVault.fromInit(
        senderAddress,
        senderAddress,
        coldWalletAddress
      )
    );

    await depositVault.send(
      provider.sender(),
      { value: toNano("0.1") },
      { $$type: "Deploy", queryId: 0n }
    );

    provider.ui().write("   Waiting for contract to deploy...");
    await waitForDeployWithRetry(provider, depositVault.address, "DepositVault");
    depositVaultAddress = depositVault.address;
    provider.ui().write(`✅ DepositVault: ${depositVaultAddress.toString()}`);
  }
  
  result.depositVault = depositVaultAddress;

  // ═══════════════════════════════════════════════════════════
  // Step 4: Deploy DiceGameV2
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n📦 [4/4] Deploying DiceGameV2...");
  provider.ui().write("   Sending deployment transaction...");
  
  const diceGame = provider.open(
    await DiceGameV2.fromInit(
      senderAddress,
      depositVaultAddress,
      prizePoolAddress
    )
  );

  await diceGame.send(
    provider.sender(),
    { value: toNano("0.1") },
    { $$type: "Deploy", queryId: 0n }
  );

  provider.ui().write("   Waiting for contract to deploy...");
  await waitForDeployWithRetry(provider, diceGame.address, "DiceGameV2");
  result.diceGameV2 = diceGame.address;
  provider.ui().write(`✅ DiceGameV2: ${diceGame.address.toString()}`);

  // ═══════════════════════════════════════════════════════════
  // Step 5: Update contract associations
  // ═══════════════════════════════════════════════════════════

  provider.ui().write("\n🔗 [5/5] Updating contract associations...");

  // Open contracts for sending messages
  const prizePoolContract = provider.open(await PrizePool.fromAddress(prizePoolAddress));
  const depositVaultContract = provider.open(await DepositVault.fromAddress(depositVaultAddress));

  // Update PrizePool's gameContract
  provider.ui().write("   → Setting DiceGameV2 as PrizePool's authorized game contract...");
  await prizePoolContract.send(
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
  await depositVaultContract.send(
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
      network: networkName,
      signers: config.multiSigSigners,
      initialPrizePool: config.initialPrizePoolAmount,
    },
    postDeploymentSteps: [
      "1. ✅ SetGameContract sent to PrizePool",
      "2. ✅ SetGameContract sent to DepositVault",
      "3. Update frontend .env with new contract addresses",
      "4. Update backend .env with new contract addresses",
      "5. Test deposit → game → withdraw flow"
    ]
  };

  const outputPath = path.join(__dirname, "../../deployment-v2.json");
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

  const envPath = path.join(__dirname, "../../deployment-v2.env");
  fs.writeFileSync(envPath, envTemplate);
  
  provider.ui().write(`\n📝 Environment variables template saved to: deployment-v2.env`);
}
