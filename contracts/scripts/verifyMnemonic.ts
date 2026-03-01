/**
 * 验证助记词对应的钱包地址
 */

import { WalletContractV4 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import * as readline from "readline";

async function promptMnemonic(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🔑 请输入你的 24 个助记词（空格分隔）:\n', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("🔍 TON 助记词地址验证工具");
  console.log("═".repeat(60));
  
  const mnemonic = await promptMnemonic();
  
  if (!mnemonic || mnemonic.split(" ").length !== 24) {
    console.error("❌ 助记词格式错误！必须是 24 个单词。");
    process.exit(1);
  }
  
  console.log("\n✅ 助记词格式正确\n");
  
  try {
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
    const workchain = 0;
    
    // WalletContractV4.create 默认使用 V4R2 版本
    const wallet = WalletContractV4.create({ 
      workchain, 
      publicKey: keyPair.publicKey
    });
    
    console.log("📍 这个助记词对应的地址（V4R2）：");
    console.log("═".repeat(60));
    console.log(`\n   ${wallet.address.toString()}\n`);
    console.log("═".repeat(60));
    
    console.log("\n💡 说明：");
    console.log("   - 同一个地址在 Mainnet 和 Testnet 都一样");
    console.log("   - 如果这不是你期望的地址，说明助记词不匹配");
    
    console.log("\n📋 配置中的地址（供对比）：");
    console.log("   1. 0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns");
    console.log("   2. 0QBiscsb5FcPiejE83xO_QsdF2ODzT8d-KlIFyChNlcBVohJ");
    console.log("   3. 0QBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJdVe");
    
    console.log("\n✅ 如果上面显示的地址与配置中的某个地址匹配，说明助记词正确！");
    console.log("❌ 如果不匹配，请检查：");
    console.log("   1. 助记词是否输入正确（顺序、拼写）");
    console.log("   2. 是否使用了正确的钱包助记词");
    console.log("");
    
  } catch (error: any) {
    console.error("\n❌ 助记词验证失败：", error.message);
    process.exit(1);
  }
}

main();
