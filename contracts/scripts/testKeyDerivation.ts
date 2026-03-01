/**
 * 测试不同的密钥派生方式
 */
import { WalletContractV4 } from "@ton/ton";
import { mnemonicToPrivateKey, mnemonicToWalletKey } from "@ton/crypto";
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
  console.log("🔍 测试不同的密钥派生方式");
  console.log("═".repeat(60));
  
  const mnemonic = await promptMnemonic();
  
  if (!mnemonic || mnemonic.split(" ").length !== 24) {
    console.error("❌ 助记词格式错误！");
    process.exit(1);
  }
  
  console.log("\n✅ 助记词格式正确\n");
  console.log(`🎯 目标地址: 0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns`);
  console.log("═".repeat(60));
  
  try {
    const words = mnemonic.split(" ");
    
    // 方法 1: mnemonicToPrivateKey (标准)
    console.log("\n【方法 1: mnemonicToPrivateKey】");
    const keyPair1 = await mnemonicToPrivateKey(words);
    const wallet1 = WalletContractV4.create({ workchain: 0, publicKey: keyPair1.publicKey });
    const addr1 = wallet1.address.toString({ testOnly: true, bounceable: false });
    console.log(`  地址: ${addr1}`);
    if (addr1 === "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns") {
      console.log("  ✅ 匹配！");
    }
    
    // 方法 2: mnemonicToWalletKey (可能有不同的派生路径)
    console.log("\n【方法 2: mnemonicToWalletKey】");
    const keyPair2 = await mnemonicToWalletKey(words);
    const wallet2 = WalletContractV4.create({ workchain: 0, publicKey: keyPair2.publicKey });
    const addr2 = wallet2.address.toString({ testOnly: true, bounceable: false });
    console.log(`  地址: ${addr2}`);
    if (addr2 === "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns") {
      console.log("  ✅ 匹配！");
    }
    
    // 方法 3: 使用密码 (空密码)
    console.log("\n【方法 3: mnemonicToPrivateKey with password】");
    const keyPair3 = await mnemonicToPrivateKey(words, "");
    const wallet3 = WalletContractV4.create({ workchain: 0, publicKey: keyPair3.publicKey });
    const addr3 = wallet3.address.toString({ testOnly: true, bounceable: false });
    console.log(`  地址: ${addr3}`);
    if (addr3 === "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns") {
      console.log("  ✅ 匹配！");
    }
    
    console.log("\n═".repeat(60));
    console.log("\n💡 如果没有匹配的，可能是：");
    console.log("   1. 助记词输入错误（顺序、拼写）");
    console.log("   2. Tonkeeper 使用了不同的钱包版本（V3R2 等）");
    console.log("   3. 这个地址不是从这个助记词派生的");
    console.log("═".repeat(60));
    
  } catch (error: any) {
    console.error("\n❌ 错误：", error.message);
    process.exit(1);
  }
}

main();
