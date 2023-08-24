import {fromB64, JsonRpcProvider, RawSigner} from "@mysten/sui.js";
import type { NetworkType } from "./network-type";
import { replaceMoveTomlForNetworkType, restoreMoveToml } from './toml';
import { SuiPackagePublisher } from "../sui-package-publisher";
import { UpgradeOptions } from "../upgrade-package";

export type Dependencies = { packagePath: string }[]

export const createUpgradePackageTxWithDependencies = async (
  packagePublisher: SuiPackagePublisher,
  packagePath: string,
  oldPackageId: string,
  upgradeCapId: string,
  dependencies: Dependencies,
  provider: JsonRpcProvider,
  publisher: string,
  networkType: NetworkType,
  options?: UpgradeOptions,
) => {
  try {
    // Need to replace the Move.toml file with the Move.${networkType}.toml file, so that the following packages can depend on it
    dependencies.forEach((dependency) => {
      replaceMoveTomlForNetworkType(dependency.packagePath, networkType);
    });
    return packagePublisher.createUpgradePackageTx(
      packagePath,
      oldPackageId,
      upgradeCapId,
      provider,
      publisher,
      options
    );
  } finally {
    // After all packages are published, restore the Move.toml file for each package
    dependencies.forEach((dependency) => {
      restoreMoveToml(dependency.packagePath);
    });
  }
}

export const upgradePackageWithDependencies = async (
  packagePublisher: SuiPackagePublisher,
  packagePath: string,
  oldPackageId: string,
  upgradeCapId: string,
  dependencies: Dependencies,
  signer: RawSigner,
  networkType: NetworkType,
  options?: UpgradeOptions,
) => {
  const provider = signer.provider;
  const publisher = await signer.getAddress();
  const tx = await createUpgradePackageTxWithDependencies(
    packagePublisher,
    packagePath,
    oldPackageId,
    upgradeCapId,
    dependencies,
    provider,
    publisher,
    networkType,
    options
  );
  const txBytes = fromB64(tx.txBytesBase64);
  return await signer.signAndExecuteTransactionBlock({ transactionBlock: txBytes });
}
