import { RawSigner } from "@mysten/sui.js"
import { SuiPackagePublisher } from "../sui-package-publisher"
import type { NetworkType } from "./network-type"
import { publishPackageBatch, PackageBatch } from "./publish-package-batch"
import { publishPackageEmpower, PublishPackageOption } from "./publish-package-empower"

/**
 * This is an advance version of the `SuiPackagePublisher` class
 * It provides more functions for publishing packages:
 * - publish a batch of packages in order
 * - create `Move.${networkType}.toml` file when publishing a package
 * - create `object-ids.${networkType}.json` file to store the objectIds when publishing a package
 *   you can customize the parser for the objectIds
 */
export class SuiAdvancePackagePublisher {
  public packagePublisher: SuiPackagePublisher
  public networkType: NetworkType;

  /**
   * Create a `SuiPackageAdvancePublisher` instance
   * @param suiBin, the path to the `sui` binary, if not provided, it will use the `sui` in the `PATH`
   * @param networkType the network type: `testnet` | `mainnet` | 'devnet' | 'localnet'
   */
  constructor(params: {suiBin?: string, networkType: NetworkType}) {
    this.networkType = params.networkType;
    this.packagePublisher = new SuiPackagePublisher(params.suiBin);
  }

  /**
   * Publish the move package and provide options to write toml and save objectIds
   * @param pkgPath path to the move package
   * @param signer the `RawSigner` from the @mysten/sui.js
   * @param option
   *  option.enforce: if true, the package will be published even if it's already published for the networkType
   *  option.writeToml: if true, it will write a `Move.${networkType}.toml` file for the package
   *  option.objectIdsParser: if provided, it will write a `object-ids.${networkType}.json` file with the parsed objectIds
   *
   *  @return the `PackagePublishResult` from the `SuiPackagePublisher` or `undefined` if the package is already published
   */
  public async publishPackage(pkgPath: string, signer: RawSigner, option?: PublishPackageOption) {
    return await publishPackageEmpower(this.packagePublisher, pkgPath, signer, this.networkType, option);
  }

  /**
   * Publish a batch of packages in order
   * @param packageBatch the array of packages to publish, you can specify the option for each package
   * @param signer the `RawSigner` from the @mysten/sui.js
   */
  public async publishPackageBatch(packageBatch: PackageBatch, signer: RawSigner) {
    return await publishPackageBatch(this.packagePublisher, packageBatch, signer, this.networkType);
  }
}
