import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV3R2, WalletContractV4 } from "@ton/ton";

async function showAllAddresses() {
  console.log("请输入你的 24 个助记词（用空格分隔）：");
  
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("助记词: ", async (input: string) => {
    try {
      const mnemonics = input.trim().split(/\s+/);
      
      if (mnemonics.length !== 24) {
        console.error("❌ 错误：需要 24 个单词，你输入了", mnemonics.length, "个");
        rl.close();
        return;
      }

      // Convert to keypair
      const keyPair = await mnemonicToPrivateKey(mnemonics);
      
      console.log("\n" + "=".repeat(60));
      console.log("🔑 从你的助记词生成的所有钱包地址（测试网）");
      console.log("=".repeat(60));
      
      // V3R2
      const walletV3 = WalletContractV3R2.create({
        workchain: 0,
        publicKey: keyPair.publicKey
      });
      
      // V4R2
      const walletV4 = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey
      });
      
      console.log("\n📍 Wallet V3R2 (旧版):");
      console.log("   Bounceable:     ", walletV3.address.toString({ testOnly: true, bounceable: true }));
      console.log("   Non-bounceable: ", walletV3.address.toString({ testOnly: true, bounceable: false }));
      
      console.log("\n📍 Wallet V4R2 (新版，推荐):");
      console.log("   Bounceable:     ", walletV4.address.toString({ testOnly: true, bounceable: true }));
      console.log("   Non-bounceable: ", walletV4.address.toString({ testOnly: true, bounceable: false }));
      
      console.log("\n💡 你要找的地址是:");
      console.log("   kQBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJYib");
      
      console.log("\n🔍 匹配检查:");
      const targetAddr = "kQBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJYib";
      const v3Match = walletV3.address.toString({ testOnly: true, bounceable: true }) === targetAddr ||
                      walletV3.address.toString({ testOnly: true, bounceable: false }) === targetAddr;
      const v4Match = walletV4.address.toString({ testOnly: true, bounceable: true }) === targetAddr ||
                      walletV4.address.toString({ testOnly: true, bounceable: false }) === targetAddr;
      
      if (v3Match) {
        console.log("   ✅ 匹配到 V3R2 钱包！");
        console.log("   💡 部署时使用这些助记词即可");
      } else if (v4Match) {
        console.log("   ✅ 匹配到 V4R2 钱包！");
        console.log("   💡 部署时使用这些助记词即可");
      } else {
        console.log("   ❌ 都不匹配！可能是：");
        console.log("      1. 助记词错误");
        console.log("      2. 需要其他钱包版本");
        console.log("      3. 地址来自不同的助记词");
      }
      
      console.log("\n🚀 部署建议:");
      console.log("   推荐使用 V4R2 地址（最新版本）");
      console.log("   向这个地址领取测试币:");
      console.log("   " + walletV4.address.toString({ testOnly: true, bounceable: true }));
      console.log("\n" + "=".repeat(60));
      
    } catch (error: any) {
      console.error("\n❌ 错误:", error.message);
    }
    
    rl.close();
  });
}

showAllAddresses();
