/**
 * 关联合约脚本 - 发送 SetGameContract 消息给 DepositVault 和 PrizePool
 *
 * 使用方法：
 * NETWORK=testnet MNEMONIC="your 24 words" npx ts-node scripts/linkContracts.ts
 */

import { Address, toNano, beginCell, TonClient, WalletContractV4, internal } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

// ── 已部署的合约地址 ───────────────────────────────────────────
const CONTRACTS = {
  depositVault: "EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P",
  prizePool:    "EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS",
  diceGameV2:   "EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut",
};

// SetGameContract op code from DepositVault ABI
const OP_SET_GAME_CONTRACT = 2882474885;

async function main() {
  const network = process.env.NETWORK ?? "testnet";
  const mnemonicStr = process.env.MNEMONIC ?? "";
  if (!mnemonicStr) {
    console.error("❌ Please provide MNEMONIC env variable");
    process.exit(1);
  }

  const endpoint = network === "mainnet"
    ? "https://toncenter.com/api/v2/jsonRPC"
    : "https://testnet.toncenter.com/api/v2/jsonRPC";

  const client = new TonClient({ endpoint });
  const mnemonic = mnemonicStr.trim().split(/\s+/);
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const walletContract = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
  const wallet = client.open(walletContract);

  console.log(`🔑 Wallet: ${walletContract.address.toString()}`);
  console.log(`🌐 Network: ${network}`);

  // Build SetGameContract payload
  // message SetGameContract { newGameContract: Address }
  const setGameContractBody = beginCell()
    .storeUint(OP_SET_GAME_CONTRACT, 32)
    .storeAddress(Address.parse(CONTRACTS.diceGameV2))
    .endCell();

  const seqno = await wallet.getSeqno();

  console.log("\n📤 Sending SetGameContract to DepositVault and PrizePool...");

  await wallet.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      // SetGameContract → DepositVault
      internal({
        to: Address.parse(CONTRACTS.depositVault),
        value: toNano("0.05"),
        body: setGameContractBody,
      }),
      // SetGameContract → PrizePool (same op code, same structure)
      internal({
        to: Address.parse(CONTRACTS.prizePool),
        value: toNano("0.05"),
        body: setGameContractBody,
      }),
    ],
  });

  console.log("✅ Transactions sent!");
  console.log("⏳ Wait ~15 seconds then verify on explorer:");
  console.log(`   DepositVault: https://testnet.tonscan.org/address/${CONTRACTS.depositVault}`);
  console.log(`   PrizePool:    https://testnet.tonscan.org/address/${CONTRACTS.prizePool}`);
}

main().catch(console.error);
