import "colorts/lib/string";
import { parsePublishTxn } from "./sui-response-parser";
import { BuildOptions, defaultBuildOptions, buildPackage } from "./build-package";
import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { SuiKit, Transaction } from "@scallop-io/sui-kit";

export type PublishOptions = BuildOptions & {
  // The gas budget for the publish transaction
  gasBudget?: number;
};
const defaultPublishOptions: PublishOptions = {
  ...defaultBuildOptions,
  gasBudget: 10 ** 9,
};

export type PackagePublishResult = {
  packageId: string;
  upgradeCapId: string;
  publisherIds: string[];
  created: { type: string; objectId: string; owner: string }[];
  publishTxn: SuiTransactionBlockResponse;
};
/**
 * Publishes a package to the SUI blockchain, and returns the packageId and publish txn response
 * @param suiBinPath, the path to the sui client binary
 * @param packagePath, the path to the package to be built
 * @param suiKit the `SuiKit` instance
 * @returns { packageId, upgradeCapId, created, publishTxn }, the packageId, upgradeCapId, created objects and publishTxn
 */
export const publishPackage = async (
  suiBinPath: string,
  packagePath: string,
  suiKit: SuiKit,
  options: PublishOptions = defaultPublishOptions
): Promise<PackagePublishResult> => {
  const gasBudget = options.gasBudget || (defaultPublishOptions.gasBudget as number);

  // build the package
  const { modules, dependencies } = buildPackage(suiBinPath, packagePath, options);

  // create a transaction block for publish package
  const publishTxnBlock = new Transaction();
  // TODO: publish dry run fails currently. Remove this once it's fixed.
  publishTxnBlock.setGasBudget(gasBudget);

  // obtain the upgradeCap, and transfer it to the publisher
  const upgradeCap = publishTxnBlock.publish({
    modules,
    dependencies,
  });
  const publisher = publishTxnBlock.pure.address(suiKit.currentAddress());
  publishTxnBlock.transferObjects([upgradeCap], publisher);

  // sign and submit the transaction for publishing the package
  console.log(`Start publishing package at ${packagePath}`);

  const publishTxn = await suiKit.client().signAndExecuteTransaction({
    transaction: publishTxnBlock,
    signer: suiKit.getKeypair(),
    options: { showEffects: true, showObjectChanges: true },
  });

  // If the publish transaction is successful, retrieve the packageId from the 'publish' event
  // Otherwise, return empty data
  if (publishTxn.effects?.status.status === "success") {
    const { packageId, upgradeCapId, publisherIds, created } = parsePublishTxn(publishTxn);
    console.log("Successfully published package\n".green);
    console.log("==============Created objects==============".gray);
    created.forEach(({ type, objectId, owner }) => {
      console.log("type: ".gray, type);
      console.log("owner: ".gray, owner);
      console.log("objectId: ".gray, objectId, "\n");
    });
    console.log("==============Package info==============".gray);
    console.log("PackageId: ".gray, packageId.blue.bold);
    console.log("UpgradeCapId: ".gray, upgradeCapId.blue.bold, "\n");
    return { packageId, publishTxn, created, upgradeCapId, publisherIds };
  } else {
    console.error("Publish package failed!".red);
    return { packageId: "", publishTxn, created: [], upgradeCapId: "", publisherIds: [] };
  }
};

/**
 * create transaction bytes for publishing a package to the SUI blockchain
 * @param suiBinPath, the path to the sui client binary
 * @param packagePath, the path to the package to be built
 * @param provider, the provider corrsponding to the network
 * @param publisher, the sender who is going the publish the package
 * @returns transaction bytes in base64 and transction block for publishing a package to the SUI blockchain
 */
export const createPublishTx = async (
  suiBinPath: string,
  packagePath: string,
  client: SuiClient,
  publisher: string,
  options: PublishOptions = defaultPublishOptions
) => {
  const gasBudget = options.gasBudget || (defaultPublishOptions.gasBudget as number);

  // build the package
  const { modules, dependencies } = buildPackage(suiBinPath, packagePath, options);

  // create a transaction block for publish package
  const publishTxnBlock = new Transaction();
  // TODO: publish dry run fails currently. Remove this once it's fixed.
  publishTxnBlock.setGasBudget(gasBudget);

  // obtain the upgradeCap, and transfer it to the publisher
  const upgradeCap = publishTxnBlock.publish({
    modules,
    dependencies,
  });
  publishTxnBlock.transferObjects([upgradeCap], publishTxnBlock.pure.address(publisher));

  // set the sender
  publishTxnBlock.setSender(publisher);

  const txBytes = await publishTxnBlock.build({ client });
  const txBytesBase64 = Buffer.from(txBytes).toString("base64");

  return { txBytesBase64, tx: publishTxnBlock };
};
