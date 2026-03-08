const { mnemonicToWalletKey, mnemonicToPrivateKey } = require('@ton/crypto');
const { WalletContractV5R1, WalletContractV4 } = require('@ton/ton');
const words = process.env.MNEMONIC.trim().split(/\s+/);
Promise.all([mnemonicToWalletKey(words), mnemonicToPrivateKey(words)]).then(([kpW5, kpV4]) => {
  const w5 = WalletContractV5R1.create({ workchain:0, publicKey: kpW5.publicKey, walletId:{ networkGlobalId:-3 }});
  const w4 = WalletContractV4.create({ workchain:0, publicKey: kpV4.publicKey });
  console.log('W5:', w5.address.toString({ bounceable: false }));
  console.log('V4:', w4.address.toString({ bounceable: false }));
  console.log('Owner应该是: 0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns');
});
