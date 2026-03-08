/**
 * 给 PrizePool 注资
 * MNEMONIC="..." AMOUNT="1" npm run fund:prizepool
 */
import { Address, toNano, beginCell, TonClient, WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { mnemonicToWalletKey } from "@ton/crypto";
import { storeFundPrizePool } from "../build/PrizePool/tact_PrizePool";

const PRIZE_POOL = "EQADwHZO5Jc5RVQ3X8URmyyImcC3HzGETsSdKPa-xjHeymnF";
const OWNER_ADDR = "0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns";
const RPC = "https://testnet.toncenter.com/api/v2/jsonRPC";

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) throw new Error("请设置 MNEMONIC 环境变量");
  const amount = process.env.AMOUNT ?? "1";
  const apiKey = process.env.TONCENTER_API_KEY;
  const client = new TonClient({ endpoint: RPC, apiKey });
  const words = mnemonic.trim().split(/\s+/);

  const kpW5 = await mnemonicToWalletKey(words);
  const walletW5 = WalletContractV5R1.create({ workchain: 0, publicKey: kpW5.publicKey, walletId: { networkGlobalId: -3 } });
  // 比较原始 hash，忽略 bounceable/testOnly 标志差异
  const ownerAddr = Address.parse(OWNER_ADDR);
  const isV5 = walletW5.address.equals(ownerAddr);
  console.log(`W5 地址: ${walletW5.address.toString({ bounceable: false })}`);
  console.log(`Owner:   ${OWNER_ADDR}`);
  console.log(`匹配: ${isV5 ? "✅ W5" : "⚠️ 不匹配，仍用W5强制发送"}`);

  const walletContract = client.open(walletW5);
  const kp = kpW5;

  const balance = await client.getBalance(walletW5.address);
  console.log(`💰 钱包余额: ${Number(balance)/1e9} TON`);

  const seqno = await walletContract.getSeqno();
  await (walletContract as ReturnType<typeof client.open<WalletContractV5R1>>).sendTransfer({
    seqno, secretKey: kp.secretKey, sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({ to: Address.parse(PRIZE_POOL), value: toNano(amount), body: beginCell().store(storeFundPrizePool({ $$type: "FundPrizePool" })).endCell() })]
  });
  console.log(`✅ 已发送 ${amount} TON 给 PrizePool，等待约 15 秒上链...`);
  await new Promise(r => setTimeout(r, 15000));

  const res = await fetch(`https://testnet.toncenter.com/api/v2/runGetMethod`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": apiKey ?? "" },
    body: JSON.stringify({ address: PRIZE_POOL, method: "poolStats", stack: [] })
  });
  const data = await res.json() as { result: { stack: [string, string][] } };
  const funds = parseInt(data.result.stack[0][1], 16);
  const maxPayout = (funds * 5000) / 10000;
  console.log(`📊 PrizePool.platformFunds: ${funds/1e9} TON`);
  console.log(`📊 maxPayoutNow: ${maxPayout/1e9} TON`);
}

main().catch(console.error);
