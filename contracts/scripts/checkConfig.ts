/**
 * 部署前配置检查脚本
 * 验证多签地址配置是否正确
 */

// 从 deployDirect.ts 读取的配置
const TESTNET_CONFIG = {
  multiSigSigners: [
    "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns",
    "0QBiscsb5FcPiejE83xO_QsdF2ODzT8d-KlIFyChNlcBVohJ",
    "0QBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJdVe",
  ],
};

const MAINNET_CONFIG = {
  multiSigSigners: [
    "UQB3J9IorzTiB6Uo17hzalUy_DcLcRZIpy6hww966Ziki5r8",
    "UQBPJkd3EkvdvyTwZPFGC6NpSRCsR4w0FXN4mG73emg1W8LW",
    "UQAN07UF1TK49WOSgdBAFLj_VsLq14uD6v4MhJiW0wtW2nMl",
  ],
};

function checkAddress(addr: string, network: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  let valid = true;

  // 检查是否为占位符
  if (addr.includes("Test") || addr.includes("AAA") || addr.includes("...")) {
    issues.push("❌ 这是一个占位符地址，需要替换");
    valid = false;
  }

  // 检查地址格式
  if (network === "testnet") {
    if (!addr.startsWith("0Q") && !addr.startsWith("kQ")) {
      issues.push("⚠️  Testnet 地址通常以 0Q 或 kQ 开头");
    }
  } else {
    if (!addr.startsWith("UQ") && !addr.startsWith("EQ")) {
      issues.push("⚠️  Mainnet 地址通常以 UQ 或 EQ 开头");
    }
  }

  // 检查长度
  if (addr.length < 40) {
    issues.push("❌ 地址长度不足，可能不是有效的 TON 地址");
    valid = false;
  }

  if (issues.length === 0) {
    issues.push("✅ 格式正确");
  }

  return { valid, issues };
}

function main() {
  console.log("🔍 TON 合约部署配置检查");
  console.log("═".repeat(60));

  let allValid = true;

  // 检查 Testnet 配置
  console.log("\n📱 TESTNET 配置检查");
  console.log("─".repeat(60));
  TESTNET_CONFIG.multiSigSigners.forEach((addr, idx) => {
    console.log(`\n签名者 ${idx + 1}: ${addr}`);
    const result = checkAddress(addr, "testnet");
    result.issues.forEach(issue => console.log(`  ${issue}`));
    if (!result.valid) allValid = false;
  });

  // 检查 Mainnet 配置
  console.log("\n\n💰 MAINNET 配置检查");
  console.log("─".repeat(60));
  MAINNET_CONFIG.multiSigSigners.forEach((addr, idx) => {
    console.log(`\n签名者 ${idx + 1}: ${addr}`);
    const result = checkAddress(addr, "mainnet");
    result.issues.forEach(issue => console.log(`  ${issue}`));
    if (!result.valid) allValid = false;
  });

  // 最终总结
  console.log("\n" + "═".repeat(60));
  if (allValid) {
    console.log("✅ 所有配置检查通过！可以开始部署。");
    console.log("\n部署命令：");
    console.log("  Testnet: NETWORK=testnet npm run deploy:direct");
    console.log("  Mainnet: NETWORK=mainnet npm run deploy:direct");
  } else {
    console.log("❌ 发现配置问题，请先修复后再部署。");
    console.log("\n修复步骤：");
    console.log("  1. 打开 contracts/scripts/deployDirect.ts");
    console.log("  2. 找到 TESTNET_CONFIG 和 MAINNET_CONFIG");
    console.log("  3. 替换占位符地址为真实的钱包地址");
    console.log("  4. 重新运行此检查脚本");
  }
  console.log("═".repeat(60) + "\n");

  process.exit(allValid ? 0 : 1);
}

main();
