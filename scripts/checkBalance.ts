import { TonClient } from "@ton/ton";
import { Address } from "@ton/core";

async function checkBalance() {
  const address = "kQBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJYib";
  
  // 连接测试网
  const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  });
  
  try {
    const addr = Address.parse(address);
    const balance = await client.getBalance(addr);
    const balanceTON = Number(balance) / 1e9;
    
    console.log("=".repeat(60));
    console.log("💰 钱包余额查询（测试网）");
    console.log("=".repeat(60));
    console.log("\n📍 地址:", address);
    console.log("\n💎 余额:", balanceTON.toFixed(4), "TON");
    
    if (balanceTON >= 15) {
      console.log("\n✅ 余额充足！可以开始部署了");
      console.log("\n🚀 运行命令：");
      console.log("   npx blueprint run deployAll --testnet");
    } else if (balanceTON > 0) {
      console.log("\n⚠️  余额不足！建议至少 15 TON");
      console.log("   请再次向 testgiver_bot 发送地址领取");
    } else {
      console.log("\n❌ 余额为 0");
      console.log("   1. 访问: https://t.me/testgiver_ton_bot");
      console.log("   2. 发送地址:", address);
      console.log("   3. 等待 1-2 分钟后重新检查");
    }
    
    console.log("\n🔗 浏览器查看:");
    console.log("   https://testnet.tonscan.org/address/" + address);
    console.log("=".repeat(60));
    
  } catch (error: any) {
    console.error("❌ 查询失败:", error.message);
    console.log("\n💡 可能原因:");
    console.log("   - 网络连接问题");
    console.log("   - 钱包尚未激活（需要先领取测试币）");
  }
}

checkBalance();
