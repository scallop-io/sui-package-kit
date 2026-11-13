import type { SuiClientTypes } from "@mysten/sui/client";

/**
 * What `client.core.signAndExecuteTransaction` must include, so the parsers below can read the result
 */
export const executeInclude = { effects: true, objectTypes: true, transaction: true } as const;

export type ExecutedTransaction = SuiClientTypes.Transaction<typeof executeInclude>;
export type ExecuteResult = SuiClientTypes.TransactionResult<typeof executeInclude>;

/**
 * A failed transaction does not throw, it comes back under `FailedTransaction`
 */
export const unwrapResult = (res: ExecuteResult): ExecutedTransaction =>
  res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;

export const parsePublishTxn = ({ effects, objectTypes, transaction }: ExecutedTransaction) => {
  const parseRes = {
    packageId: "",
    upgradeCapId: "",
    publisherIds: [] as string[],
    created: [] as { type: string; objectId: string; owner: string }[],
  };
  for (const change of effects.changedObjects) {
    if (change.idOperation !== "Created") continue;
    if (change.outputState === "PackageWrite") {
      parseRes.packageId = change.objectId;
      continue;
    }
    const type = objectTypes[change.objectId] ?? "";
    if (type.endsWith("package::UpgradeCap")) {
      parseRes.upgradeCapId = change.objectId;
    } else if (type.endsWith("package::Publisher")) {
      parseRes.publisherIds.push(change.objectId);
    } else {
      const owner = parseOwner(change.outputOwner, transaction.sender ?? "");
      parseRes.created.push({ type, objectId: change.objectId, owner });
    }
  }
  return parseRes;
};

export const parseUpgradeTxn = ({ effects, objectTypes }: ExecutedTransaction) => {
  const parseRes = { packageId: "", upgradeCapId: "" };
  for (const change of effects.changedObjects) {
    if (change.idOperation === "Created" && change.outputState === "PackageWrite") {
      parseRes.packageId = change.objectId;
    } else if ((objectTypes[change.objectId] ?? "").endsWith("package::UpgradeCap")) {
      parseRes.upgradeCapId = change.objectId;
    }
  }
  return parseRes;
};

const parseOwner = (owner: SuiClientTypes.ObjectOwner | null, sender: string) => {
  switch (owner?.$kind) {
    case "AddressOwner":
      return owner.AddressOwner === sender ? `(you) ${sender}` : owner.AddressOwner;
    case "ConsensusAddressOwner":
      return owner.ConsensusAddressOwner.owner === sender
        ? `(you) ${sender}`
        : owner.ConsensusAddressOwner.owner;
    case "Shared":
      return "Shared";
    case "Immutable":
      return "Immutable";
    default:
      return "";
  }
};
