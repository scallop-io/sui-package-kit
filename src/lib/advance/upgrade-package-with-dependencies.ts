import type { NetworkType } from "./network-type";
import { replaceMoveTomlForNetworkType, restoreMoveToml } from "./toml";
import { SuiPackagePublisher } from "../sui-package-publisher";
import { UpgradeOptions } from "../upgrade-package";
import { SuiClient } from "@mysten/sui/client";
import { fromB64, SuiKit } from "@scallop-io/sui-kit";

export type Dependencies = { packagePath: string }[];

export const createUpgradePackageTxWithDependencies = async (
  packagePublisher: SuiPackagePublisher,
  packagePath: string,
  oldPackageId: string,
  upgradeCapId: string,
  dependencies: Dependencies,
  client: SuiClient,
  publisher: string,
  networkType: NetworkType,
  options?: UpgradeOptions
) => {
  try {
    // Need to replace the Move.toml file with the Move.${networkType}.toml file, so that the following packages can depend on it
    dependencies.forEach((dependency) => {
      replaceMoveTomlForNetworkType(dependency.packagePath, networkType);
    });
    return packagePublisher.createUpgradePackageTx(packagePath, oldPackageId, upgradeCapId, client, publisher, options);
  } finally {
    // After all packages are published, restore the Move.toml file for each package
    dependencies.forEach((dependency) => {
      restoreMoveToml(dependency.packagePath);
    });
  }
};

export const upgradePackageWithDependencies = async (
  packagePublisher: SuiPackagePublisher,
  packagePath: string,
  oldPackageId: string,
  upgradeCapId: string,
  dependencies: Dependencies,
  suiKit: SuiKit,
  networkType: NetworkType,
  options?: UpgradeOptions
) => {
  const publisher = suiKit.currentAddress();
  const tx = await createUpgradePackageTxWithDependencies(
    packagePublisher,
    packagePath,
    oldPackageId,
    upgradeCapId,
    dependencies,
    suiKit.client(),
    publisher,
    networkType,
    options
  );
  const txBytes = fromB64(tx.txBytesBase64);
  return await suiKit.client().signAndExecuteTransaction({ transaction: txBytes, signer: suiKit.getKeypair() });
};
