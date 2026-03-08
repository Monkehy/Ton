/**
 * 独立部署脚本 - 直接使用助记词部署到 Testnet/Mainnet
 * 不依赖 Blueprint 的钱包选择器
 * 
 * 使用方法：
 * NETWORK=testnet MNEMONIC="your 24 words here" npm run deploy:direct
 * 或
 * NETWORK=mainnet MNEMONIC="your 24 words here" npm run deploy:direct
 */

import { Address, toNano, beginCell, Dictionary, TonClient, WalletContractV4, WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { mnemonicToPrivateKey, mnemonicToWalletKey } from "@ton/crypto";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Import compiled contracts
import { MultiSigColdWallet } from "../../build/MultiSigColdWallet/tact_MultiSigColdWallet";
import { PrizePool } from "../../build/PrizePool/tact_PrizePool";
import { DepositVault } from "../../build/DepositVault/tact_DepositVault";
import { DiceGameV2 } from "../../build/DiceGameV2/tact_DiceGameV2";

// 支持的钱包版本
type WalletVersion = "v3r2" | "v4r2";
const WALLET_VERSION: WalletVersion = "v4r2"; // 使用 V4R2 版本（Tonkeeper 默认）

// ═══════════════════════════════════════════════════════════
// 配置区域
// ═══════════════════════════════════════════════════════════

// Testnet 配置
const TESTNET_CONFIG = {
  multiSigSigners: [
    "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns",
    "0QBiscsb5FcPiejE83xO_QsdF2ODzT8d-KlIFyChNlcBVohJ",
    "0QBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJdVe",
  ],
  ownerAddress: "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns",
  initialPrizePoolAmount: "0.1", // Testnet 初始奖池金额（TON）- 降低到 0.1 TON 节省测试币
  rpcEndpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  explorerUrl: "https://testnet.tonscan.org/address/",
};

// Mainnet 配置
const MAINNET_CONFIG = {
  multiSigSigners: [
    "UQB3J9IorzTiB6Uo17hzalUy_DcLcRZIpy6hww966Ziki5r8", // Mainnet Signer 1
    "UQBPJkd3EkvdvyTwZPFGC6NpSRCsR4w0FXN4mG73emg1W8LW", // Mainnet Signer 2
    "UQAN07UF1TK49WOSgdBAFLj_VsLq14uD6v4MhJiW0wtW2nMl", // Mainnet Signer 3
  ],
  ownerAddress: "UQB3J9IorzTiB6Uo17hzalUy_DcLcRZIpy6hww966Ziki5r8",
  initialPrizePoolAmount: "1", // Mainnet 初始奖池金额（TON）- 测试阶段使用 1 TON
  rpcEndpoint: "https://toncenter.com/api/v2/jsonRPC",
  explorerUrl: "https://tonscan.org/address/",
};

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════

interface DeploymentResult {
  multiSigColdWallet: Address;
  prizePool: Address;
  depositVault: Address;
  diceGameV2: Address;
}

function log(message: string) {
  console.log(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForDeploy(client: TonClient, address: Address, contractName: string): Promise<void> {
  log(`   Waiting for ${contractName} deployment confirmation...`);
  
  const maxAttempts = 60; // 60 attempts * 2s = 2 minutes
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const state = await client.getContractState(address);
      if (state.state === "active") {
        log(`   ✅ ${contractName} deployed successfully!`);
        return;
      }
    } catch (error) {
      // Contract not found yet, continue waiting
    }
    
    await sleep(2000); // Wait 2 seconds before next check
    
    if ((i + 1) % 10 === 0) {
      log(`   Still waiting... (${i + 1}/${maxAttempts})`);
    }
  }
  
  throw new Error(`${contractName} deployment timeout. Check explorer: ${address.toString()}`);
}

async function promptMnemonic(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\n🔑 Please enter your 24-word mnemonic phrase:\n', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function confirmDeployment(network: string, config: typeof TESTNET_CONFIG): Promise<boolean> {
  log("\n" + "═".repeat(60));
  log(`📋 Deployment Configuration (${network.toUpperCase()})`);
  log("═".repeat(60));
  log(`Network: ${network}`);
  log(`RPC Endpoint: ${config.rpcEndpoint}`);
  log(`Initial Prize Pool: ${config.initialPrizePoolAmount} TON`);
  log(`Multi-Sig Signers:`);
  config.multiSigSigners.forEach((addr, idx) => {
    log(`  ${idx + 1}. ${addr}`);
  });
  log("═".repeat(60));

  // Check for placeholder addresses
  const hasPlaceholders = config.multiSigSigners.some(s => 
    s.includes("Test") || s.includes("AAA") || s.includes("...")
  );
  
  if (hasPlaceholders) {
    log("\n⚠️  WARNING: Detected placeholder addresses!");
    log("⚠️  Please update the addresses in deployDirect.ts before deploying.\n");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\nContinue with deployment? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// ═══════════════════════════════════════════════════════════
// 主部署逻辑
// ═══════════════════════════════════════════════════════════

async function main() {
  // 1. Parse environment variables
  const network = process.env.NETWORK || "testnet";
  let mnemonic = process.env.MNEMONIC || "";

  if (!["testnet", "mainnet"].includes(network)) {
    throw new Error(`Invalid NETWORK: ${network}. Use 'testnet' or 'mainnet'`);
  }

  const config = network === "testnet" ? TESTNET_CONFIG : MAINNET_CONFIG;

  log("🚀 TON V2 Architecture Direct Deployment Script");
  log("═".repeat(60));

  // 2. Confirm deployment
  const confirmed = await confirmDeployment(network, config);
  if (!confirmed) {
    log("\n❌ Deployment cancelled by user.\n");
    process.exit(0);
  }

  // 3. Get mnemonic
  if (!mnemonic) {
    mnemonic = await promptMnemonic();
  }

  if (!mnemonic || mnemonic.split(" ").length !== 24) {
    throw new Error("Invalid mnemonic. Must be 24 words separated by spaces.");
  }

  log("\n✅ Mnemonic received");

  // 4. Initialize wallet
  log("\n🔐 Initializing wallet...");
  const kpDirect    = await mnemonicToPrivateKey(mnemonic.split(" "));
  const kpTonkeeper = await mnemonicToWalletKey(mnemonic.split(" "));
  const workchain = 0;

  // 优先 W5 testnet (Tonkeeper 默认)
  const walletV5 = WalletContractV5R1.create({
    workchain,
    publicKey: kpTonkeeper.publicKey,
    walletId: { networkGlobalId: -3 },
  });

  // fallback V4R2
  const walletV4Direct    = WalletContractV4.create({ workchain, publicKey: kpDirect.publicKey });
  const walletV4Tonkeeper = WalletContractV4.create({ workchain, publicKey: kpTonkeeper.publicKey });

  // 默认用 V5 地址（最常见），candidate 匹配后可能覆盖
  let matchedWallet: WalletContractV5R1 | WalletContractV4 = walletV5;
  let keyPair: { publicKey: Buffer; secretKey: Buffer } = kpTonkeeper;
  let isV5 = true;

  // 如果 config 里有 OWNER_ADDRESS，尝试精确匹配
  if (config.ownerAddress) {
    const target = config.ownerAddress.trim();
    const candidates = [
      { wallet: walletV5,           keyPair: kpTonkeeper, name: "v5r1/tonkeeper/testnet" },
      { wallet: walletV4Direct,     keyPair: kpDirect,    name: "v4r2/direct" },
      { wallet: walletV4Tonkeeper,  keyPair: kpTonkeeper, name: "v4r2/tonkeeper" },
    ];
    for (const c of candidates) {
      const addrTest = c.wallet.address.toString({ bounceable: false, testOnly: true });
      const addrMain = c.wallet.address.toString({ bounceable: false, testOnly: false });
      if (addrTest === target || addrMain === target) {
        matchedWallet = c.wallet;
        keyPair = c.keyPair;
        isV5 = c.name.startsWith("v5");
        log(`📌 Matched wallet: ${c.name}`);
        break;
      }
    }
  } else {
    log("📌 Using default: v5r1/tonkeeper/testnet");
  }

  const walletAddress = matchedWallet.address;
  const walletAddressStr = network === "testnet"
    ? walletAddress.toString({ testOnly: true, bounceable: false })
    : walletAddress.toString({ bounceable: false });

  log(`   Wallet Address: ${walletAddressStr}`);

  // 5. Initialize TON Client
  log("\n🌐 Connecting to TON network...");
  const client = new TonClient({
    endpoint: config.rpcEndpoint,
    apiKey: process.env.TONCENTER_API_KEY,
  });

  // 6. Check wallet balance
  const balance = await client.getBalance(walletAddress);
  const balanceTON = Number(balance) / 1e9;
  log(`   Network: ${network.toUpperCase()}`);
  log(`   Wallet Balance: ${balanceTON.toFixed(2)} TON`);

  const requiredBalance = Number(config.initialPrizePoolAmount) + 1; // Prize pool + gas (最低要求)
  if (balanceTON < requiredBalance) {
    log("\n⚠️  余额不足！");
    log(`   需要: ${requiredBalance} TON`);
    log(`   当前: ${balanceTON.toFixed(2)} TON`);
    
    if (network === "testnet") {
      log("\n📖 如何获取 Testnet 测试币：");
      log(`   1. 打开 Telegram: https://t.me/testgiver_ton_bot`);
      log(`   2. 发送你的钱包地址: ${walletAddress.toString()}`);
      log(`   3. 收到测试币后重新运行部署命令`);
      log("\n💡 提示：同一个助记词在 testnet 和 mainnet 是同一个地址，");
      log("   但两个网络的余额是独立的。你需要给 testnet 地址充值测试币。");
    } else {
      log("\n💡 请确保你的主网钱包有足够的 TON 余额。");
    }
    
    throw new Error(
      `Insufficient balance. Required: ${requiredBalance} TON, Available: ${balanceTON.toFixed(2)} TON`
    );
  }

  // 7. Open wallet contract
  const walletContract = client.open(matchedWallet as WalletContractV5R1);

  // 统一发送函数，V5 需要额外的 sendMode 参数
  async function sendTransfer(args: { seqno: number; secretKey: Buffer; messages: ReturnType<typeof internal>[] }) {
    if (isV5) {
      await (walletContract as ReturnType<typeof client.open<WalletContractV5R1>>).sendTransfer({
        seqno: args.seqno,
        secretKey: args.secretKey,
        messages: args.messages,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
      });
    } else {
      await (client.open(matchedWallet as WalletContractV4) as ReturnType<typeof client.open<WalletContractV4>>).sendTransfer({
        seqno: args.seqno,
        secretKey: args.secretKey,
        messages: args.messages,
      });
    }
  }
  const seqno = await walletContract.getSeqno();
  log(`   Current Seqno: ${seqno}`);

  const result: DeploymentResult = {} as DeploymentResult;

  // ═══════════════════════════════════════════════════════════
  // Step 1: Deploy MultiSigColdWallet
  // ═══════════════════════════════════════════════════════════
  log("\n📦 [1/4] Deploying MultiSigColdWallet...");

  const signersMap = Dictionary.empty<bigint, Address>();
  config.multiSigSigners.forEach((addr, idx) => {
    try {
      signersMap.set(BigInt(idx), Address.parse(addr));
    } catch {
      signersMap.set(BigInt(idx), walletAddress);
    }
  });

  const coldWallet = await MultiSigColdWallet.fromInit(walletAddress, signersMap);
  const coldWalletAddress = coldWallet.address;
  result.multiSigColdWallet = coldWalletAddress;

  log(`   Address: ${coldWalletAddress.toString()}`);
  log(`   Sending deployment transaction...`);

  await sendTransfer({
    seqno: seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: coldWalletAddress,
        value: toNano("0.1"),
        init: coldWallet.init,
        body: beginCell().storeUint(0, 32).storeBuffer(Buffer.from("Deploy")).endCell(),
      }),
    ],
  });

  await waitForDeploy(client, coldWalletAddress, "MultiSigColdWallet");

  // ═══════════════════════════════════════════════════════════
  // Step 2: Deploy PrizePool
  // ═══════════════════════════════════════════════════════════
  log("\n📦 [2/4] Deploying PrizePool...");

  const prizePool = await PrizePool.fromInit(walletAddress, walletAddress, walletAddress);
  const prizePoolAddress = prizePool.address;
  result.prizePool = prizePoolAddress;

  log(`   Address: ${prizePoolAddress.toString()}`);
  log(`   Sending deployment transaction...`);

  const currentSeqno1 = await walletContract.getSeqno();
  await sendTransfer({
    seqno: currentSeqno1,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: prizePoolAddress,
        value: toNano("0.1"),
        init: prizePool.init,
        body: beginCell().storeUint(0, 32).storeBuffer(Buffer.from("Deploy")).endCell(),
      }),
    ],
  });

  await waitForDeploy(client, prizePoolAddress, "PrizePool");

  // Fund prize pool
  log(`\n💰 Funding prize pool with ${config.initialPrizePoolAmount} TON...`);
  
  const currentSeqno2 = await walletContract.getSeqno();
  await sendTransfer({
    seqno: currentSeqno2,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: prizePoolAddress,
        value: toNano(config.initialPrizePoolAmount),
        body: beginCell().storeUint(0, 32).storeBuffer(Buffer.from("FundPrizePool")).endCell(),
      }),
    ],
  });

  await sleep(5000); // Wait for funding transaction
  log(`   ✅ Prize pool funded`);

  // ═══════════════════════════════════════════════════════════
  // Step 3: Deploy DepositVault
  // ═══════════════════════════════════════════════════════════
  log("\n📦 [3/4] Deploying DepositVault...");

  // DepositVault 需要 4 个参数：owner, gameContract (先用 owner 占位), coldWalletAddress, prizePool (先用 owner 占位)
  const depositVault = await DepositVault.fromInit(walletAddress, walletAddress, coldWalletAddress, walletAddress);
  const depositVaultAddress = depositVault.address;
  result.depositVault = depositVaultAddress;

  log(`   Address: ${depositVaultAddress.toString()}`);
  log(`   Sending deployment transaction...`);

  const currentSeqno3 = await walletContract.getSeqno();
  await sendTransfer({
    seqno: currentSeqno3,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: depositVaultAddress,
        value: toNano("0.1"),
        init: depositVault.init,
        body: beginCell().storeUint(0, 32).storeBuffer(Buffer.from("Deploy")).endCell(),
      }),
    ],
  });

  await waitForDeploy(client, depositVaultAddress, "DepositVault");

  // ═══════════════════════════════════════════════════════════
  // Step 4: Deploy DiceGameV2
  // ═══════════════════════════════════════════════════════════
  log("\n📦 [4/4] Deploying DiceGameV2...");

  // hotWallet = deployer wallet (owner), can be changed later via SetHotWallet
  const diceGame = await DiceGameV2.fromInit(walletAddress, depositVaultAddress, prizePoolAddress, walletAddress);
  const diceGameAddress = diceGame.address;
  result.diceGameV2 = diceGameAddress;

  log(`   Address: ${diceGameAddress.toString()}`);
  log(`   Sending deployment transaction...`);

  const currentSeqno4 = await walletContract.getSeqno();
  await sendTransfer({
    seqno: currentSeqno4,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: diceGameAddress,
        value: toNano("0.1"),
        init: diceGame.init,
        body: beginCell().storeUint(0, 32).storeBuffer(Buffer.from("Deploy")).endCell(),
      }),
    ],
  });

  await waitForDeploy(client, diceGameAddress, "DiceGameV2");

  // ═══════════════════════════════════════════════════════════
  // Step 5: Configure Contracts (Set Game Contract)
  // ═══════════════════════════════════════════════════════════
  log("\n⚙️  [5/5] Configuring contract relationships...");
  log("   Note: This step may require manual configuration via multi-sig");
  log("   Please send SetGameContract messages to PrizePool and DepositVault");

  // ═══════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════
  const deploymentInfo = {
    network: network.toUpperCase(),
    timestamp: new Date().toISOString(),
    deployer: walletAddress.toString(),
    contracts: {
      multiSigColdWallet: result.multiSigColdWallet.toString(),
      prizePool: result.prizePool.toString(),
      depositVault: result.depositVault.toString(),
      diceGameV2: result.diceGameV2.toString(),
    },
    config: {
      signers: config.multiSigSigners,
      initialPrizePool: config.initialPrizePoolAmount,
    },
    explorerLinks: {
      multiSigColdWallet: `${config.explorerUrl}${result.multiSigColdWallet.toString()}`,
      prizePool: `${config.explorerUrl}${result.prizePool.toString()}`,
      depositVault: `${config.explorerUrl}${result.depositVault.toString()}`,
      diceGameV2: `${config.explorerUrl}${result.diceGameV2.toString()}`,
    },
  };

  const outputPath = path.join(__dirname, `../../deployment-${network}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  // ═══════════════════════════════════════════════════════════
  // Final summary
  // ═══════════════════════════════════════════════════════════
  log("\n" + "═".repeat(60));
  log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
  log("═".repeat(60));
  log(`\n📄 Deployment info saved to: ${outputPath}\n`);
  log("Deployed Contracts:");
  log(`  1. MultiSigColdWallet: ${result.multiSigColdWallet.toString()}`);
  log(`  2. PrizePool:          ${result.prizePool.toString()}`);
  log(`  3. DepositVault:       ${result.depositVault.toString()}`);
  log(`  4. DiceGameV2:         ${result.diceGameV2.toString()}`);
  log("\nExplorer Links:");
  log(`  MultiSig: ${config.explorerUrl}${result.multiSigColdWallet.toString()}`);
  log(`  PrizePool: ${config.explorerUrl}${result.prizePool.toString()}`);
  log(`  Deposit: ${config.explorerUrl}${result.depositVault.toString()}`);
  log(`  Game: ${config.explorerUrl}${result.diceGameV2.toString()}`);
  log("\n" + "═".repeat(60));
  log("\n✅ Next Steps:");
  log("  1. Update frontend/.env with new contract addresses");
  log("  2. Update backend/.env with new contract addresses");
  log("  3. Test the full flow: deposit → game → withdraw");
  log("  4. Configure SetGameContract messages (may require multi-sig)");
  log("\n");
}

// Run the deployment
main().catch((error) => {
  console.error("\n❌ Deployment failed:");
  console.error(error instanceof Error ? error.stack : error);
  if (error && typeof error === 'object' && 'response' in error) {
    const e = error as { response?: { data?: unknown; status?: number } };
    console.error("HTTP status:", e.response?.status);
    console.error("Response data:", JSON.stringify(e.response?.data, null, 2));
  }
  process.exit(1);
});
