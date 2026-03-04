/**
 * 诊断脚本 - 检查钱包状态
 * NETWORK=testnet TONCENTER_API_KEY="xxx" MNEMONIC="24 words" npx ts-node scripts/checkWallet.ts
 */
import { TonClient, WalletContractV4, WalletContractV3R2 } from "@ton/ton";
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

  // Two derivation methods: direct vs Tonkeeper-style
  const kpDirect = await mnemonicToPrivateKey(words);
  const kpTonkeeper = await mnemonicToWalletKey(words);

  const candidates = [
    { name: "v4r2 (direct)",     pk: kpDirect.publicKey,    contract: WalletContractV4.create({ publicKey: kpDirect.publicKey, workchain: 0 }) },
    { name: "v4r2 (tonkeeper)",  pk: kpTonkeeper.publicKey, contract: WalletContractV4.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) },
    { name: "v3r2 (direct)",     pk: kpDirect.publicKey,    contract: WalletContractV3R2.create({ publicKey: kpDirect.publicKey, workchain: 0 }) },
    { name: "v3r2 (tonkeeper)",  pk: kpTonkeeper.publicKey, contract: WalletContractV3R2.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) },
  ];

  const TARGET = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";
  console.log(`\n🎯 Looking for: ${TARGET}\n`);

  for (const { name, contract } of candidates) {
    const addr = contract.address.toString({ bounceable: false, testOnly: network === "testnet" });
    const match = addr === TARGET ? " ← ✅ MATCH!" : "";
    try {
      const bal = await client.getBalance(contract.address);
      const state = await client.getContractState(contract.address);
      console.log(`[${name}] ${addr}${match}`);
      console.log(`   balance: ${Number(bal) / 1e9} TON  |  state: ${state.state}`);
    } catch {
      console.log(`[${name}] ${addr}${match}  (cannot read)`);
    }
  }
}

main().catch(console.error);

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
