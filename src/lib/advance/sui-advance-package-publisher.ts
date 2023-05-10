import { RawSigner } from "@mysten/sui.js"
import { SuiPackagePublisher } from "../sui-package-publisher"
import type { NetworkType } from "./network-type"
import { publishPackageBatch, PackageBatch } from "./publish-package-batch"
import { publishPackageEmpower } from "./publish-package-empower"

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

  /**
   * Create a `SuiPackageAdvancePublisher` instance
   * @param suiBin, the path to the `sui` binary, if not provided, it will use the `sui` in the `PATH`
   */
  constructor(suiBin?: string) {
    this.packagePublisher = new SuiPackagePublisher(suiBin);
  }

  /**
   * Publish the move package and provide options to write toml and save objectIds
   * @param pkgPath path to the move package
   * @param signer the `RawSigner` from the @mysten/sui.js
   * @param networkType the network type: `testnet` | `mainnet` | 'devnet' | 'localhost'
   * @param option
   *  option.enforce: if true, the package will be published even if it's already published for the networkType
   *  option.writeToml: if true, it will write a `Move.${networkType}.toml` file for the package
   *  option.objectIdsParser: if provided, it will write a `object-ids.${networkType}.json` file with the parsed objectIds
   *
   *  @return the `PackagePublishResult` from the `SuiPackagePublisher` or `undefined` if the package is already published
   */
  public async publishPackage(pkgPath: string, signer: RawSigner, networkType: NetworkType) {
    return await publishPackageEmpower(this.packagePublisher, pkgPath, signer, networkType);
  }

  /**
   * Publish a batch of packages in order
   * @param packageBatch the array of packages to publish, you can specify the option for each package
   * @param signer the `RawSigner` from the @mysten/sui.js
   * @param networkType the network type: `testnet` | `mainnet` | 'devnet' | 'localhost'
   */
  public async publishPackageBatch(packageBatch: PackageBatch, signer: RawSigner, networkType: NetworkType) {
    return await publishPackageBatch(this.packagePublisher, packageBatch, signer, networkType);
  }
}
