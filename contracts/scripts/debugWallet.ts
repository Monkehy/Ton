/**
 * 完整测试：对比所有钱包版本生成的地址
 */
import { Address, WalletContractV4, WalletContractV3R2, WalletContractV3R1, WalletContractV2R2, WalletContractV2R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import * as readline from "readline";

async function promptMnemonic(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🔑 请输入你的 24 个助记词:\n', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("🔍 TON 钱包地址完整测试（所有版本）");
  console.log("═".repeat(60));
  
  const mnemonic = await promptMnemonic();
  
  if (!mnemonic || mnemonic.split(" ").length !== 24) {
    console.error("❌ 助记词格式错误！");
    process.exit(1);
  }
  
  console.log("\n✅ 助记词格式正确\n");
  
  try {
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
    const workchain = 0;
    
    const targetAddress = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";
    
    console.log(`🎯 目标地址：${targetAddress}`);
    console.log("═".repeat(60));
    
    const wallets = [
      { name: "V4R2", wallet: WalletContractV4.create({ workchain, publicKey: keyPair.publicKey }) },
      { name: "V3R2", wallet: WalletContractV3R2.create({ workchain, publicKey: keyPair.publicKey }) },
      { name: "V3R1", wallet: WalletContractV3R1.create({ workchain, publicKey: keyPair.publicKey }) },
      { name: "V2R2", wallet: WalletContractV2R2.create({ workchain, publicKey: keyPair.publicKey }) },
      { name: "V2R1", wallet: WalletContractV2R1.create({ workchain, publicKey: keyPair.publicKey }) },
    ];
    
    for (const { name, wallet } of wallets) {
      console.log(`\n【${name}】`);
      
      const formats = [
        { label: "bounceable (EQ)", addr: wallet.address.toString({ bounceable: true }) },
        { label: "non-bounceable (UQ)", addr: wallet.address.toString({ bounceable: false }) },
        { label: "testOnly (0Q)", addr: wallet.address.toString({ testOnly: true, bounceable: false }) },
        { label: "testOnly+bounce (kQ)", addr: wallet.address.toString({ testOnly: true, bounceable: true }) },
      ];
      
      for (const { label, addr } of formats) {
        const match = addr === targetAddress ? " ✅ 匹配！" : "";
        console.log(`  ${label}: ${addr}${match}`);
      }
    }
    
    console.log("\n═".repeat(60));
    console.log("\n💡 如果找到匹配项，说明应该使用对应的钱包版本和地址格式");
    console.log("═".repeat(60));
    
  } catch (error: any) {
    console.error("\n❌ 错误：", error.message);
    process.exit(1);
  }
}

main();
