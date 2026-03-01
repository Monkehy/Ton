import { toNano } from "@ton/core";
import { NetworkProvider } from "@ton/blueprint";
import { DiceGame } from "../build/DiceGame/tact_DiceGame";

export async function run(provider: NetworkProvider) {
  const sender = provider.sender();
  if (!sender.address) {
    throw new Error("wallet sender address is unavailable");
  }

  const contract = provider.open(await DiceGame.fromInit(sender.address));
  await contract.send(
    provider.sender(),
    { value: toNano("0.1") },
    {
      $$type: "SetConfig",
      minAmount: toNano("0.1"),
      reserveFloor: toNano("1000"),
      safetyFactorPpm: 20000n
    }
  );

  await provider.waitForDeploy(contract.address);
  provider.ui().write(`DiceGame deployed on mainnet: ${contract.address.toString()}`);
}
