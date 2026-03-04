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

  const kpDirect    = await mnemonicToPrivateKey(words);
  const kpTonkeeper = await mnemonicToWalletKey(words);

  // W5 地址与 networkGlobalId 有关：mainnet=-239, testnet=-3
  // Tonkeeper 连接 mainnet 时用 -239，即使在 testnet 浏览器上显示也可能是 mainnet 地址
  const globalIds = [
    { label: "mainnet(-239)", id: -239 },
    { label: "testnet(-3)",   id: -3   },
  ];

  const candidates: { name: string; contract: { address: { toString(opt: object): string } } & object }[] = [];

  for (const { label, id } of globalIds) {
    candidates.push({
      name: `v5r1/tonkeeper/${label}`,
      contract: WalletContractV5R1.create({ publicKey: kpTonkeeper.publicKey, workchain: 0, walletId: { networkGlobalId: id } }),
    });
    candidates.push({
      name: `v5r1/direct/${label}`,
      contract: WalletContractV5R1.create({ publicKey: kpDirect.publicKey, workchain: 0, walletId: { networkGlobalId: id } }),
    });
  }

  // V4 / V3 不受 globalId 影响
  candidates.push({ name: "v4r2/tonkeeper", contract: WalletContractV4.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) });
  candidates.push({ name: "v4r2/direct",    contract: WalletContractV4.create({ publicKey: kpDirect.publicKey,    workchain: 0 }) });
  candidates.push({ name: "v3r2/tonkeeper", contract: WalletContractV3R2.create({ publicKey: kpTonkeeper.publicKey, workchain: 0 }) });
  candidates.push({ name: "v3r2/direct",    contract: WalletContractV3R2.create({ publicKey: kpDirect.publicKey,    workchain: 0 }) });

  const TARGET = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";
  console.log(`\n🎯 Looking for owner: ${TARGET}\n`);

  for (const { name, contract } of candidates) {
    // 尝试两种地址格式（testOnly true/false）
    const addrTest = (contract as WalletContractV4).address.toString({ bounceable: false, testOnly: true });
    const addrMain = (contract as WalletContractV4).address.toString({ bounceable: false, testOnly: false });
    const matchTest = addrTest === TARGET ? "  ← ✅ MATCH (testOnly)" : "";
    const matchMain = addrMain === TARGET ? "  ← ✅ MATCH (mainnet fmt)" : "";
    const match = matchTest || matchMain;

    try {
      const bal   = await client.getBalance((contract as WalletContractV4).address);
      const state = await client.getContractState((contract as WalletContractV4).address);
      const mark  = state.state === "active" ? "✅" : bal > 0n ? "🟡" : "⬜";
      console.log(`${mark} [${name}]${match}`);
      console.log(`   testnet fmt : ${addrTest}`);
      console.log(`   mainnet fmt : ${addrMain}`);
      console.log(`   balance: ${Number(bal) / 1e9} TON  |  state: ${state.state}\n`);
    } catch {
      console.log(`⬜ [${name}]${match}`);
      console.log(`   testnet fmt : ${addrTest}`);
      console.log(`   mainnet fmt : ${addrMain}\n`);
    }
  }
}

main().catch(console.error);
