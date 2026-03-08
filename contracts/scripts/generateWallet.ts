import { WalletContractV5R1 } from "@ton/ton";
import { mnemonicNew, mnemonicToWalletKey } from "@ton/crypto";

async function main() {
  const mnemonic = await mnemonicNew(24);
  const kp = await mnemonicToWalletKey(mnemonic);

  const wallet = WalletContractV5R1.create({
    publicKey: kp.publicKey,
    workchain: 0,
    walletId: { networkGlobalId: -3 }, // testnet
  });

  const addr = wallet.address.toString({ bounceable: false, testOnly: true });

  console.log("═".repeat(60));
  console.log("🔑 New Hot Wallet Generated");
  console.log("═".repeat(60));
  console.log("Address (testnet):", addr);
  console.log("Mnemonic (KEEP SECRET):");
  console.log(mnemonic.join(" "));
  console.log("═".repeat(60));
  console.log("Next steps:");
  console.log("1. Send 1-2 testnet TON to the address above for gas");
  console.log("2. Run SetHotWallet to register this address in DiceGameV2");
  console.log("3. Put the mnemonic in backend/.env as HOT_WALLET_MNEMONIC");
  console.log("═".repeat(60));
}

main().catch(console.error);
