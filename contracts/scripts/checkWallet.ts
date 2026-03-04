/**
 * 诊断脚本 - 检查钱包状态
 * NETWORK=testnet TONCENTER_API_KEY="xxx" MNEMONIC="24 words" npx ts-node scripts/checkWallet.ts
 */
import { TonClient, WalletContractV4 } from "@ton/ton";
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
  const w = WalletContractV4.create({ publicKey: kp.publicKey, workchain: 0 });

  console.log("Wallet (bounceable)    :", w.address.toString({ bounceable: true, testOnly: network === "testnet" }));
  console.log("Wallet (non-bounceable):", w.address.toString({ bounceable: false, testOnly: network === "testnet" }));

  try {
    const bal = await client.getBalance(w.address);
    const state = await client.getContractState(w.address);
    console.log("Balance:", Number(bal) / 1e9, "TON");
    console.log("State  :", state.state);

    if (state.state === "uninitialized") {
      if (bal > 0n) {
        console.log("\n✅ Wallet has balance and will be activated on first send.");
        console.log("   You can run: npm run link:contracts");
      } else {
        console.log("\n⚠️  Wallet is uninitialized on testnet!");
        console.log("   Send some testnet TON to the address above, then retry.");
        console.log("   Faucet: https://t.me/testgiver_ton_bot");
      }
    } else if (bal < 200000000n) {
      console.log("\n⚠️  Low balance! Need at least 0.2 TON. Use faucet: https://t.me/testgiver_ton_bot");
    } else {
      console.log("\n✅ Wallet is ready. You can run: npm run link:contracts");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("Error:", msg);
  }
}

main().catch(console.error);
