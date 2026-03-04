/**
 * 诊断脚本 - 检查钱包状态
 * NETWORK=testnet TONCENTER_API_KEY="xxx" MNEMONIC="24 words" npm run check:wallet
 */
import { TonClient, WalletContractV4, WalletContractV3R2, WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey, mnemonicToWalletKey } from "@ton/crypto";

async function main() {
  const network = (process.env.NETWORK ?? "testnet") as string;
  const mnemonicStr = (process.env.MNEMONIC ?? "") as string;
  const apiKey = (process.env.TONCENTER_API_KEY ?? "") as string;

  if (!mnemonicStr) { console.error("❌ MNEMONIC missing"); process.exit(1); }

  const endpoint = network === "mainnet"
    ? "https://toncenter.com/api/v2/jsonRPC"
    : "https://testnet.toncenter.com/api/v2/jsonRPC";

  const client = new TonClient({ endpoint, apiKey: apiKey || undefined });
  const words = mnemonicStr.trim().split(/\s+/);

  // 两种派生方式：直接派生 vs Tonkeeper 风格
  const kpDirect    = await mnemonicToPrivateKey(words);
  const kpTonkeeper = await mnemonicToWalletKey(words);

  const candidates = [
    { name: "v5r1 (tonkeeper)", contract: WalletContractV5R1.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) },
    { name: "v5r1 (direct)",    contract: WalletContractV5R1.create({ publicKey: kpDirect.publicKey,    workchain: 0 }) },
    { name: "v4r2 (tonkeeper)", contract: WalletContractV4.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) },
    { name: "v4r2 (direct)",    contract: WalletContractV4.create({ publicKey: kpDirect.publicKey,    workchain: 0 }) },
    { name: "v3r2 (tonkeeper)", contract: WalletContractV3R2.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) },
    { name: "v3r2 (direct)",    contract: WalletContractV3R2.create({ publicKey: kpDirect.publicKey,    workchain: 0 }) },
  ];

  const TARGET = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";
  console.log(`\n🎯 Looking for owner: ${TARGET}\n`);

  for (const { name, contract } of candidates) {
    const addr    = contract.address.toString({ bounceable: false, testOnly: network === "testnet" });
    const addrEQ  = contract.address.toString({ bounceable: true,  testOnly: network === "testnet" });
    const match   = addr === TARGET ? "  ← ✅ MATCH!" : "";
    try {
      const bal   = await client.getBalance(contract.address);
      const state = await client.getContractState(contract.address);
      const mark  = state.state === "active" ? "✅" : bal > 0n ? "🟡" : "⬜";
      console.log(`${mark} [${name}]${match}`);
      console.log(`   non-bounceable: ${addr}`);
      console.log(`   bounceable    : ${addrEQ}`);
      console.log(`   balance: ${Number(bal) / 1e9} TON  |  state: ${state.state}\n`);
    } catch {
      console.log(`⬜ [${name}] ${addr}${match}  (cannot read)\n`);
    }
  }
}

main().catch(console.error);
