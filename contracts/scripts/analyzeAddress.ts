/**
 * 反向分析目标地址
 */
import { Address } from "@ton/ton";

const targetAddress = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";

console.log("🔍 分析目标地址");
console.log("═".repeat(60));
console.log(`目标地址: ${targetAddress}\n`);

try {
  const addr = Address.parse(targetAddress);
  
  console.log("地址信息：");
  console.log(`  workChain: ${addr.workChain}`);
  console.log(`  hash (hex): ${addr.hash.toString('hex')}`);
  
  console.log("\n所有可能的表示形式：");
  console.log(`  Raw: ${addr.toRawString()}`);
  console.log(`  默认: ${addr.toString()}`);
  console.log(`  bounceable=true: ${addr.toString({ bounceable: true })}`);
  console.log(`  bounceable=false: ${addr.toString({ bounceable: false })}`);
  console.log(`  testOnly=true: ${addr.toString({ testOnly: true })}`);
  console.log(`  testOnly=true, bounceable=false: ${addr.toString({ testOnly: true, bounceable: false })}`);
  
  console.log("\n═".repeat(60));
  console.log("💡 地址特征：");
  console.log(`   - workChain = ${addr.workChain}`);
  console.log(`   - 地址前缀 '0Q' 表示 testOnly + non-bounceable`);
  
} catch (error: any) {
  console.error("❌ 解析地址失败：", error.message);
}
