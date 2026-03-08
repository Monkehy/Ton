import { TonClient, WalletContractV5R1, WalletContractV4, internal, SendMode, Address, beginCell } from "@ton/ton";
import { mnemonicToWalletKey, mnemonicToPrivateKey } from "@ton/crypto";

const DICE_GAME_ADDRESS = process.env.DICE_GAME_ADDRESS || "EQCmjQigvXYLiUGyGDOv-UFx29zxOyY6KTxv29YWbJI_unYY";
const HOT_WALLET_ADDRESS = process.env.NEW_HOT_WALLET || "";
const TONCENTER_API_KEY  = process.env.TONCENTER_API_KEY || "";
const MNEMONIC           = process.env.MNEMONIC || "";
const NETWORK            = process.env.NETWORK || "testnet";

const OP_SET_HOT_WALLET = 2292123516; // SetHotWallet op from DiceGameV2

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!HOT_WALLET_ADDRESS) {
    console.error("❌ Missing NEW_HOT_WALLET env var (the new hot wallet address)");
    process.exit(1);
  }
  if (!MNEMONIC) {
    console.error("❌ Missing MNEMONIC env var (your owner/deployer wallet mnemonic)");
    process.exit(1);
  }

  const endpoint = NETWORK === "testnet"
    ? "https://testnet.toncenter.com/api/v2/jsonRPC"
    : "https://toncenter.com/api/v2/jsonRPC";

  const client = new TonClient({ endpoint, apiKey: TONCENTER_API_KEY });

  const kpTonkeeper = await mnemonicToWalletKey(MNEMONIC.trim().split(/\s+/));
  const kpDirect    = await mnemonicToPrivateKey(MNEMONIC.trim().split(/\s+/));

  // Auto-detect W5 vs V4
  const walletV5 = WalletContractV5R1.create({
    publicKey: kpTonkeeper.publicKey,
    workchain: 0,
    walletId: { networkGlobalId: -3 },
  });
  const walletV4 = WalletContractV4.create({ publicKey: kpDirect.publicKey, workchain: 0 });

  // Pick whichever has balance
  const balV5 = await client.getBalance(walletV5.address).catch(() => 0n);
  const balV4 = await client.getBalance(walletV4.address).catch(() => 0n);

  let wallet: WalletContractV5R1 | WalletContractV4;
  let kp: { publicKey: Buffer; secretKey: Buffer };
  let isV5: boolean;

  if (balV5 > 0n) {
    wallet = walletV5; kp = kpTonkeeper; isV5 = true;
    console.log("📌 Using v5r1/tonkeeper/testnet");
  } else {
    wallet = walletV4; kp = kpDirect; isV5 = false;
    console.log("📌 Using v4r2/direct");
  }

  const w = client.open(wallet as WalletContractV5R1);
  const seqno = await w.getSeqno();

  const body = beginCell()
    .storeUint(OP_SET_HOT_WALLET, 32)
    .storeAddress(Address.parse(HOT_WALLET_ADDRESS))
    .endCell();

  console.log(`🔑 Sending SetHotWallet to DiceGameV2...`);
  console.log(`   New hot wallet: ${HOT_WALLET_ADDRESS}`);

  const msg = internal({ to: Address.parse(DICE_GAME_ADDRESS), value: 50000000n, body });

  if (isV5) {
    await (w as ReturnType<typeof client.open<WalletContractV5R1>>).sendTransfer({
      seqno, secretKey: kp.secretKey, messages: [msg],
      sendMode: SendMode.PAY_GAS_SEPARATELY,
    });
  } else {
    await (client.open(wallet as WalletContractV4) as ReturnType<typeof client.open<WalletContractV4>>).sendTransfer({
      seqno, secretKey: kp.secretKey, messages: [msg],
    });
  }

  console.log("✅ Sent! Waiting 15s...");
  await sleep(15000);
  console.log("🎉 Done! Verify on explorer:");
  console.log(`   https://testnet.tonscan.org/address/${DICE_GAME_ADDRESS}`);
}

main().catch(console.error);
