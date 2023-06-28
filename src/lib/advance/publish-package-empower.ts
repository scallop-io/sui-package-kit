import * as path from "path";
import * as fs from "fs";
import { RawSigner } from "@mysten/sui.js";
import { SuiPackagePublisher } from "../sui-package-publisher";
import type { NetworkType } from "@scallop-io/sui-kit";
import type { PackagePublishResult } from "../publish-package"
import { parseMoveToml, writeMoveToml } from "./toml";
import { writeAsJson } from './write-as-json'

export type PublishResultParser = (publishResult: PackagePublishResult) => Record<string, any>;
export type PublishPackageOption = {
  // if true, the package will be published even if it's already published for the networkType
  enforce?: boolean
  // if true, it will write a `Move.${networkType}.toml` file for the package
  writeToml?: boolean
  // if true, it will write a `publish-result.${networkType}.json` file with the parsed objectIds
  publishResultParser?: PublishResultParser
}

/**
 * Publish the move package and provide options to write toml and save objectIds
 * @param packagePublisher the `SuiPackagePublisher` instance
 * @param pkgPath path to the move package
 * @param signer the `RawSigner` from the @mysten/sui.js
 * @param networkType the network type: `testnet` | `mainnet` | 'devnet' | 'localnet'
 * @param option
 *  option.enforce: if true, the package will be published even if it's already published for the networkType
 *  option.writeToml: if true, it will write a `Move.${networkType}.toml` file for the package
 *  option.publishResultParser: if provided, it will write a `publish-result.${networkType}.json` file with the parsed objectIds
 */
export const publishPackageEmpower = async (
  packagePublisher: SuiPackagePublisher,
  pkgPath: string,
  signer: RawSigner,
  networkType: NetworkType,
  option: PublishPackageOption = { enforce: false, writeToml: false, publishResultParser: undefined }
) => {
  const enforce = option.enforce || false;
  const writeToml = option.writeToml || false;
  const publishResultParser = option.publishResultParser || undefined;

  const moveTomlPathForNetworkType = path.join(pkgPath, `Move.${networkType}.toml`);
  const shouldPublish = !fs.existsSync(moveTomlPathForNetworkType) || enforce;
  if (shouldPublish) {
    const res = await publishPackage(packagePublisher, pkgPath, signer);
    if (writeToml) {
      writeTomlForNetworkType(pkgPath, res.packageId, networkType);
    }
    if (publishResultParser) {
      const defaultPublishResult = { packageId: res.packageId, upgradeCapId: res.upgradeCapId, publisherId: res.publisherId };
      const parsedPublishResult = publishResultParser(res);
      const output = { ...defaultPublishResult, ...parsedPublishResult };
      writeAsJson(output, path.join(pkgPath, `publish-result.${networkType}.json`));
    }
    return res;
  } else {
    console.log(`Package already published on ${networkType} at path: ${pkgPath}`.cyan);
  }
}

/**
 * Publish the package using the `SuiPackagePublisher`
 * @param packagePublisher the `SuiPackagePublisher` instance
 * @param pkgPath path to the move package
 * @param signer the `RawSigner` from the @mysten/sui.js
 * @return the `PackagePublishResult` from the `SuiPackagePublisher`
 */
const publishPackage = async (
  packagePublisher: SuiPackagePublisher,
  pkgPath: string,
  signer: RawSigner
) => {
  const gasBudget = 10 ** 9;
  const res = await packagePublisher.publishPackage(pkgPath, signer, {
    gasBudget,
    withUnpublishedDependencies: false,
    skipFetchLatestGitDeps: true
  });
  if (!res.packageId) {
    console.error(res);
    throw new Error(`Package publish failed at path: ${pkgPath}`)
  }
  return res;
}

/**
 *
 * Write the `Move.${networkType}.toml` file with the given packageId based on the `Move.toml`
 * @param pkgPath path to the move package
 * @param packageId the packageId for the given networkType
 * @param networkType 'devnet' | 'testnet' | 'mainnet' | 'localnet'
 */
const writeTomlForNetworkType = (pkgPath: string, packageId: string, networkType: NetworkType) => {
  const tomlPath = path.join(pkgPath, "Move.toml");
  const moveToml = parseMoveToml(tomlPath);
  moveToml.package["published-at"] = packageId;
  const addresses = moveToml.addresses;
  for (const key in addresses) {
    addresses[key] = packageId;
  }
  const newTomlPath = path.join(pkgPath, `Move.${networkType}.toml`);
  writeMoveToml(moveToml, newTomlPath);
}
