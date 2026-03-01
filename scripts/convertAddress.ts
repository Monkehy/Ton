import { Address } from "@ton/core";

const address = "kQBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJYib";

try {
  const addr = Address.parse(address);
  
  console.log("=".repeat(60));
  console.log("📍 地址格式转换");
  console.log("=".repeat(60));
  console.log("\n原始地址:", address);
  console.log("\n✅ 所有可用格式：");
  console.log("\n1️⃣ Bounceable (测试网，推荐用于合约):");
  console.log("   ", addr.toString({ testOnly: true, bounceable: true }));
  console.log("\n2️⃣ Non-bounceable (测试网，推荐用于钱包):");
  console.log("   ", addr.toString({ testOnly: true, bounceable: false }));
  console.log("\n3️⃣ Raw 格式 (通用):");
  console.log("   ", addr.toRawString());
  console.log("\n💡 提示：领取测试币时，这几种格式都可以用！");
  console.log("=".repeat(60));
} catch (error) {
  console.error("❌ 地址格式错误:", error);
}
