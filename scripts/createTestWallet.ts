import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";
import { Address } from "@ton/core";

async function main() {
  // Generate new mnemonic
  const mnemonics = await mnemonicNew(24);
  
  // Convert to keypair
  const keyPair = await mnemonicToPrivateKey(mnemonics);
  
  // Create wallet
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey
  });
  
  console.log("=".repeat(60));
  console.log("🎉 测试网钱包已生成！");
  console.log("=".repeat(60));
  console.log("\n📝 助记词（请妥善保存）：");
  console.log(mnemonics.join(" "));
  console.log("\n📍 钱包地址：");
  console.log(wallet.address.toString({ testOnly: true }));
  console.log("\n💰 获取测试币：");
  console.log("1. 访问: https://t.me/testgiver_ton_bot");
  console.log("2. 发送上面的钱包地址");
  console.log("3. 等待 1-2 分钟");
  console.log("\n🚀 然后运行：");
  console.log("npx blueprint run deployAll --testnet");
  console.log("选择 'mnemonic' 选项，粘贴上面的助记词");
  console.log("=".repeat(60));
}

main().catch(console.error);
