import "colorts/lib/string";
import { Transaction, UpgradePolicy } from "@scallop-io/sui-kit";
import { buildPackage } from "./build-package";
import { parseUpgradeTxn } from "./sui-response-parser";
import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { bcs } from "@mysten/bcs";

/**
 * Options for upgrade packages
 */
export type UpgradeOptions = {
  // Also publish transitive dependencies that are not published yet
  withUnpublishedDependencies?: boolean;
  // Skip fetching the latest git dependencies
  skipFetchLatestGitDeps?: boolean;
  gasBudget?: number;
};

const defaultUpgradeOptions: UpgradeOptions = {
  withUnpublishedDependencies: true,
  skipFetchLatestGitDeps: false,
  gasBudget: 10 ** 9,
};

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
  client: SuiClient,
  keyPair: Keypair,
  options: UpgradeOptions = defaultUpgradeOptions
) => {
  const gasBudget = options.gasBudget || (defaultUpgradeOptions.gasBudget as number);

  // build the package
  const { modules, dependencies, digest } = buildPackage(suiBinPath, packagePath, options);

  // create a transaction block for upgrade package
  const upgradeTxnBlock = new Transaction();
  // TODO: publish dry run fails currently. Remove this once it's fixed.
  upgradeTxnBlock.setGasBudget(gasBudget);

  // Create the upgrade ticket
  const ticket = upgradeTxnBlock.moveCall({
    target: `0x2::package::authorize_upgrade`,
    arguments: [
      upgradeTxnBlock.object(_upgradeCapId),
      upgradeTxnBlock.pure.u8(UpgradePolicy.COMPATIBLE),
      upgradeTxnBlock.pure(
        bcs
          .byteVector()
          .serialize(new Uint8Array(JSON.parse(digest)))
          .toBytes()
      ),
    ],
  });

  // Upgrade the package with the ticket, get the receipt
  const receipt = upgradeTxnBlock.upgrade({
    modules,
    dependencies,
    package: oldPackageId,
    ticket,
  });

  // Commit the upgrade with the receipt
  upgradeTxnBlock.moveCall({
    target: `0x2::package::commit_upgrade`,
    arguments: [upgradeTxnBlock.object(_upgradeCapId), receipt],
  });

  // sign and submit the transaction for upgrading the package
  console.log(`Start upgrading package at ${packagePath}`.cyan);
  const upgradeTxn = await client.signAndExecuteTransaction({
    transaction: upgradeTxnBlock,
    signer: keyPair,
    options: { showEffects: true, showObjectChanges: true },
  });
  // If the upgrade transaction is successful, retrieve the packageId from the 'upgrade' event
  // Otherwise, return empty data
  if (upgradeTxn.effects?.status.status === "success") {
    const { packageId, upgradeCapId } = parseUpgradeTxn(upgradeTxn);
    console.log(`Successfully upgraded package at ${packagePath}`.green);
    console.log("==============Package info==============".gray);
    console.log("PackageId: ".gray, packageId.blue.bold);
    console.log("UpgradeCapId: ".gray, upgradeCapId.blue.bold, "\n");
    return { packageId, upgradeCapId, upgradeTxn };
  } else {
    console.log(`Failed to upgrade package at ${packagePath}`.red);
    return { packageId: "", upgradeCapId: "", upgradeTxn };
  }
};

/**
 * Create a publish package transaction for signing and sending
 * @param suiBinPath, the path to the sui client binary
 * @param packagePath, the path to the package to be built
 */
export const createUpgradePackageTx = async (
  suiBinPath: string,
  packagePath: string,
  oldPackageId: string,
  upgradeCapId: string,
  client: SuiClient,
  publisher: string,
  options: UpgradeOptions = defaultUpgradeOptions
) => {
  const gasBudget = options.gasBudget || (defaultUpgradeOptions.gasBudget as number);

  // build the package
  const { modules, dependencies, digest } = buildPackage(suiBinPath, packagePath, options);

  // create a transaction block for upgrade package
  const upgradeTxnBlock = new Transaction();
  // TODO: publish dry run fails currently. Remove this once it's fixed.
  upgradeTxnBlock.setGasBudget(gasBudget);

  // Create the upgrade ticket
  const ticket = upgradeTxnBlock.moveCall({
    target: `0x2::package::authorize_upgrade`,
    arguments: [
      upgradeTxnBlock.object(upgradeCapId),
      upgradeTxnBlock.pure.u8(UpgradePolicy.COMPATIBLE),
      upgradeTxnBlock.pure(
        bcs
          .byteVector()
          .serialize(new Uint8Array(JSON.parse(digest)))
          .toBytes()
      ),
    ],
  });

  // Upgrade the package with the ticket, get the receipt
  const receipt = upgradeTxnBlock.upgrade({
    modules,
    dependencies,
    package: oldPackageId,
    ticket,
  });

  // Commit the upgrade with the receipt
  upgradeTxnBlock.moveCall({
    target: `0x2::package::commit_upgrade`,
    arguments: [upgradeTxnBlock.object(upgradeCapId), receipt],
  });

  // set the sender
  upgradeTxnBlock.setSender(publisher);

  const txBytes = await upgradeTxnBlock.build({ client });
  const txBytesBase64: string = Buffer.from(txBytes).toString("base64");

  return { txBytesBase64, tx: upgradeTxnBlock };
};
