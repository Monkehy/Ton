import { TonClient, WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { Address, toNano } from "@ton/core";

const VAULT = "EQB2Nm6IKvvXV7kkmPFQCn1YwE8KCOCxIjOM6suVoM1wnhxX";
const RPC   = "https://testnet.toncenter.com/api/v2/jsonRPC";

async function main() {
  const raw = process.env.MNEMONIC ?? "";
  if (!raw) throw new Error("Please provide MNEMONIC env variable");
  const mnemonic = raw.trim().split(/\s+/);
  const apiKey   = process.env.TONCENTER_API_KEY;

  const kp     = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: kp.publicKey, walletId: { networkGlobalId: -3 } });
  const client = new TonClient({ endpoint: RPC, apiKey });
  const contract = client.open(wallet);

  console.log("发送地址:", wallet.address.toString({ testOnly: true }));
  const bal = await client.getBalance(wallet.address);
  console.log("余额:", Number(bal) / 1e9, "TON");

  const seqno = await contract.getSeqno();
  await contract.sendTransfer({
    seqno,
    secretKey: kp.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({
      to: Address.parse(VAULT),
      value: toNano("0.5"),
      bounce: false,
    })],
  });

  console.log("✅ 已发送 0.5 TON 给 DepositVault，等待约 15 秒上链...");
  await new Promise(r => setTimeout(r, 15000));

  const vaultBal = await client.getBalance(Address.parse(VAULT));
  console.log("DepositVault 余额:", Number(vaultBal) / 1e9, "TON");
}

main().catch(e => { console.error(e); process.exit(1); });
