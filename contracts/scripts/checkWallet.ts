/**
 * 诊断脚本 - 检查钱包状态
 * NETWORK=testnet TONCENTER_API_KEY="xxx" MNEMONIC="24 words" npx ts-node scripts/checkWallet.ts
 */
import { TonClient, WalletContractV4, WalletContractV3R2 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

async function main() {
  const network = (process.env.NETWORK ?? "testnet") as string;
  const mnemonicStr = (process.env.MNEMONIC ?? "") as string;
  const apiKey = (process.env.TONCENTER_API_KEY ?? "") as string;

  if (!mnemonicStr) { console.error("❌ MNEMONIC missing"); process.exit(1); }

  const endpoint = network === "mainnet"
    ? "https://toncenter.com/api/v2/jsonRPC"
    : "https://testnet.toncenter.com/api/v2/jsonRPC";

  const client = new TonClient({ endpoint, apiKey: apiKey || undefined });
  const kp = await mnemonicToPrivateKey(mnemonicStr.trim().split(/\s+/));

  const wallets = [
    { name: "v4r2", contract: WalletContractV4.create({ publicKey: kp.publicKey, workchain: 0 }) },
    { name: "v3r2", contract: WalletContractV3R2.create({ publicKey: kp.publicKey, workchain: 0 }) },
  ];

  console.log("\n🔍 Checking all wallet versions:\n");
  for (const { name, contract } of wallets) {
    const addr = contract.address.toString({ bounceable: false, testOnly: network === "testnet" });
    const addrEQ = contract.address.toString({ bounceable: true, testOnly: network === "testnet" });
    try {
      const bal = await client.getBalance(contract.address);
      const state = await client.getContractState(contract.address);
      const mark = state.state === "active" ? "✅" : state.state === "uninitialized" && bal > 0n ? "🟡" : "⬜";
      console.log(`${mark} [${name}]`);
      console.log(`   non-bounceable: ${addr}`);
      console.log(`   bounceable    : ${addrEQ}`);
      console.log(`   balance: ${Number(bal) / 1e9} TON  |  state: ${state.state}`);
    } catch {
      console.log(`⬜ [${name}] ${addr} — cannot read`);
    }
    console.log();
  }

  console.log("👉 The owner of DepositVault/PrizePool is: 0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns");
  console.log("   Find the version above whose non-bounceable address matches.");
}

main().catch(console.error);
