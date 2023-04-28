import 'colorts/lib/string';
import {
  TransactionBlock,
  RawSigner,
  getExecutionStatusType,
  UpgradePolicy,
} from "@mysten/sui.js";
import { buildPackage } from "./build-package";
import { parseUpgradeTxn } from "./sui-response-parser";

/**
 * Options for upgrade packages
 */
export type UpgradeOptions = {
  // Also publish transitive dependencies that are not published yet
  withUnpublishedDependencies?: boolean
  // Skip fetching the latest git dependencies
  skipFetchLatestGitDeps?: boolean
  gasBudget?: number,
}

const defaultUpgradeOptions: UpgradeOptions = {
  withUnpublishedDependencies: true,
  skipFetchLatestGitDeps: false,
  gasBudget: 10**9,
}

/**
 * Upgrade a package to the SUI blockchain using the sui client binary
 * @param suiBinPath, the path to the sui client binary
 * @param packagePath, the path to the package to be built
 */
export const upgradePackage = async (
  suiBinPath: string,
  packagePath: string,
  oldPackageId: string,
  _upgradeCapId: string,
  signer: RawSigner,
  options: UpgradeOptions = defaultUpgradeOptions
) => {
  const gasBudget = options.gasBudget || defaultUpgradeOptions.gasBudget as number;

  // build the package
  const { modules, dependencies, digest } = buildPackage(suiBinPath, packagePath, options);

  // create a transaction block for upgrade package
  const upgradeTxnBlock = new TransactionBlock();
  // TODO: publish dry run fails currently. Remove this once it's fixed.
  upgradeTxnBlock.setGasBudget(gasBudget);

  // Create the upgrade ticket
  const ticket = upgradeTxnBlock.moveCall({
    target: `0x2::package::authorize_upgrade`,
    arguments: [
      upgradeTxnBlock.object(_upgradeCapId),
      upgradeTxnBlock.pure(UpgradePolicy.COMPATIBLE),
      upgradeTxnBlock.pure(digest)
    ]
  });

  // Upgrade the package with the ticket, get the receipt
  const receipt = upgradeTxnBlock.upgrade({
    modules,
    dependencies,
    packageId: oldPackageId,
    ticket
  });

  // Commit the upgrade with the receipt
  upgradeTxnBlock.moveCall({
    target: `0x2::package::commit_upgrade`,
    arguments: [
      upgradeTxnBlock.object(_upgradeCapId),
      receipt,
    ]
  });

  // sign and submit the transaction for upgrading the package
  console.log(`Start upgrading package at ${packagePath}`.cyan)
  const upgradeTxn = await signer.signAndExecuteTransactionBlock({
    transactionBlock: upgradeTxnBlock,
    options: { showEffects: true, showObjectChanges: true },
  });
  // If the upgrade transaction is successful, retrieve the packageId from the 'upgrade' event
  // Otherwise, return empty data
  if (getExecutionStatusType(upgradeTxn) === 'success') {
    const { packageId, upgradeCapId } = parseUpgradeTxn(upgradeTxn);
    console.log(`Successfully upgraded package at ${packagePath}`.green)
    console.log('==============Package info=============='.gray)
    console.log('PackageId: '.gray, packageId.blue.bold)
    console.log('UpgradeCapId: '.gray, upgradeCapId.blue.bold, '\n')
    return  { packageId, upgradeCapId, upgradeTxn };
  } else {
    console.log(`Failed to upgrade package at ${packagePath}`.red)
    return  { packageId: '', upgradeCapId: '', upgradeTxn };
  }
}
