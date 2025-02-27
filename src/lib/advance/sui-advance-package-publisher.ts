import { SuiPackagePublisher } from "../sui-package-publisher";
import type { NetworkType } from "./network-type";
import { publishPackageBatch, PackageBatch } from "./publish-package-batch";
import { publishPackageEmpower, PublishPackageOption } from "./publish-package-empower";
import {
  createUpgradePackageTxWithDependencies,
  upgradePackageWithDependencies,
} from "./upgrade-package-with-dependencies";
import { UpgradeOptions } from "../upgrade-package";
import { SuiKit } from "@scallop-io/sui-kit";
import { SuiClient } from "@mysten/sui/client";

/**
 * This is an advance version of the `SuiPackagePublisher` class
 * It provides more functions for publishing packages:
 * - publish a batch of packages in order
 * - create `Move.${networkType}.toml` file when publishing a package
 * - create `object-ids.${networkType}.json` file to store the objectIds when publishing a package
 *   you can customize the parser for the objectIds
 */
export class SuiAdvancePackagePublisher {
  public packagePublisher: SuiPackagePublisher;
  public networkType: NetworkType;

  /**
   * Create a `SuiPackageAdvancePublisher` instance
   * @param suiBin, the path to the `sui` binary, if not provided, it will use the `sui` in the `PATH`
   * @param networkType the network type: `testnet` | `mainnet` | 'devnet' | 'localnet'
   */
  constructor(params: { suiBin?: string; networkType: NetworkType }) {
    this.networkType = params.networkType;
    this.packagePublisher = new SuiPackagePublisher(params.suiBin);
  }

  /**
   * Publish the move package and provide options to write toml and save objectIds
   * @param pkgPath path to the move package
   * @param suiKit SuiKit instance
   * @param option
   *  option.enforce: if true, the package will be published even if it's already published for the networkType
   *  option.writeToml: if true, it will write a `Move.${networkType}.toml` file for the package
   *  option.objectIdsParser: if provided, it will write a `object-ids.${networkType}.json` file with the parsed objectIds
   *
   *  @return the `PackagePublishResult` from the `SuiPackagePublisher` or `undefined` if the package is already published
   */
  public async publishPackage(pkgPath: string, suiKit: SuiKit, option?: PublishPackageOption) {
    return await publishPackageEmpower(this.packagePublisher, pkgPath, suiKit, this.networkType, option);
  }

  /**
   * Publish a batch of packages in order
   * @param packageBatch the array of packages to publish, you can specify the option for each package
   * @param suiKit SuiKit instance
   */
  public async publishPackageBatch(packageBatch: PackageBatch, suiKit: SuiKit) {
    return await publishPackageBatch(this.packagePublisher, packageBatch, suiKit, this.networkType);
  }

  public async upgradePackageWithDependencies(
    packagePath: string,
    oldPackageId: string,
    upgradeCapId: string,
    dependencies: { packagePath: string }[],
    suiKit: SuiKit,
    options?: UpgradeOptions
  ) {
    return await upgradePackageWithDependencies(
      this.packagePublisher,
      packagePath,
      oldPackageId,
      upgradeCapId,
      dependencies,
      suiKit,
      this.networkType,
      options
    );
  }

  public async createUpgradePackageTxWithDependencies(
    packagePath: string,
    oldPackageId: string,
    upgradeCapId: string,
    dependencies: { packagePath: string }[],
    client: SuiClient,
    publisher: string,
    options?: UpgradeOptions
  ) {
    return await createUpgradePackageTxWithDependencies(
      this.packagePublisher,
      packagePath,
      oldPackageId,
      upgradeCapId,
      dependencies,
      client,
      publisher,
      this.networkType,
      options
    );
  }
}
