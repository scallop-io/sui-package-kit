import * as path from "path";
import * as fs from "fs";
import { RawSigner } from "@mysten/sui.js";
import type { NetworkType } from "./network-type";
import type { PackagePublishResult } from "../publish-package";
import { SuiPackagePublisher } from "../sui-package-publisher";
import { publishPackageEmpower } from "./publish-package-empower";
import type { PublishPackageOption } from "./publish-package-empower"

export type PackageBatch = { packagePath: string, option?: PublishPackageOption }[]

/**
 * Publish a batch of packages in order
 * @param packagePublisher the `SuiPackagePublisher` instance
 * @param packageBatch the batch of packages to publish, you can specify the option for each package
 * @param signer the `RawSigner` from the @mysten/sui.js
 * @param networkType the network type: `testnet` | `mainnet` | 'devnet' | 'localnet'
 */
export const publishPackageBatch = async (
  packagePublisher: SuiPackagePublisher,
  packageBatch: PackageBatch,
  signer: RawSigner,
  networkType: NetworkType,
) => {
  const normalizedPackageBatch = normalizePackageBatch(packageBatch);
  try {
    for (const pkg of normalizedPackageBatch) {
      await publishPackageEmpower(packagePublisher, pkg.packagePath, signer, networkType, pkg.option);
      // Need to replace the Move.toml file with the Move.${networkType}.toml file, so that the following packages can depend on it
      replaceMoveTomlForNetworkType(pkg.packagePath, networkType);
    }
  } finally {
    // After all packages are published, restore the Move.toml file for each package
    normalizedPackageBatch.forEach((pkg) => {
      restoreMoveToml(pkg.packagePath);
    });
  }
}

const normalizePackageBatch = (packageBatch: PackageBatch) => {
  return packageBatch.map((pkg) => {
    const option: PublishPackageOption = {
      enforce: false,
      writeToml: true,
      publishResultParser: () => ({}),
      ...pkg.option
    };
    return { packagePath: pkg.packagePath, option }
  })
}

const defaultPublishResultParser = (publishResult: PackagePublishResult) => {
  const packageId = publishResult.packageId;
  const upgradeCapId = publishResult.upgradeCapId;
  return { packageId, upgradeCapId }
}
/**
 *
 * Replace the `Move.toml` file with the `Move.${networkType}.toml` file
 * And make a backup of the `Move.toml` file as `Move.toml.bak`
 * @param pkgPath path to the move package
 * @param networkType 'devnet' | 'testnet' | 'mainnet' | 'localnet'
 */
const replaceMoveTomlForNetworkType = (pkgPath: string, networkType: NetworkType) => {
  const tomlPathForNetwork= path.join(pkgPath, `Move.${networkType}.toml`);
  if (!fs.existsSync(tomlPathForNetwork)) {
    throw new Error(`Move.${networkType}.toml not found in ${pkgPath}`);
  }

  const backupMoveTomlPath = path.join(pkgPath, "Move.toml.bak");
  fs.cpSync(path.join(pkgPath, "Move.toml"), backupMoveTomlPath);

  fs.cpSync(tomlPathForNetwork, path.join(pkgPath, "Move.toml"));
}

/**
 * Restore the `Move.toml` file from the backup file `Move.toml.bak`
 * @param pkgPath path to the move package
 */
const restoreMoveToml = (pkgPath: string) => {
  const backupMoveTomlPath = path.join(pkgPath, "Move.toml.bak");
  if (!fs.existsSync(backupMoveTomlPath)) return;
  fs.cpSync(backupMoveTomlPath, path.join(pkgPath, "Move.toml"));
  fs.rmSync(backupMoveTomlPath);
}
