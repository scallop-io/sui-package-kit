import { SuiObjectChange, SuiTransactionBlockResponse } from "@mysten/sui/client";

export const parsePublishTxn = ({ objectChanges }: SuiTransactionBlockResponse) => {
  if (!objectChanges) throw new Error("objectChanges is null or undefined");

  const parseRes = {
    packageId: "",
    upgradeCapId: "",
    publisherIds: [] as string[],
    created: [] as { type: string; objectId: string; owner: string }[],
  };
  if (objectChanges) {
    for (const change of objectChanges) {
      if (change.type === "created" && change.objectType.endsWith("package::UpgradeCap")) {
        parseRes.upgradeCapId = change.objectId;
      } else if (change.type === "created" && change.objectType.endsWith("package::Publisher")) {
        parseRes.publisherIds.push(change.objectId);
      } else if (change.type === "published") {
        parseRes.packageId = change.packageId;
      } else if (change.type === "created") {
        const owner = parseOwnerFromObjectChange(change);
        parseRes.created.push({ type: change.objectType, objectId: change.objectId, owner });
      }
    }
  }
  return parseRes;
};

export const parseUpgradeTxn = ({ objectChanges }: SuiTransactionBlockResponse) => {
  if (!objectChanges) throw new Error("objectChanges is null or undefined");

  const parseRes = { packageId: "", upgradeCapId: "" };
  if (objectChanges) {
    for (const change of objectChanges) {
      if (change.type === "published") {
        parseRes.packageId = change.packageId;
      } else if (change.objectType.endsWith("package::UpgradeCap")) {
        parseRes.upgradeCapId = change.objectId;
      }
    }
  }
  return parseRes;
};

const parseOwnerFromObjectChange = (change: SuiObjectChange & { type: "created" }) => {
  const sender = change?.sender;
  if (typeof change.owner === "object" && "AddressOwner" in change.owner) {
    return change.owner.AddressOwner === sender ? `(you) ${sender}` : change.owner.AddressOwner;
  } else if (typeof change.owner === "object" && "Shared" in change.owner) {
    return "Shared";
  } else if (typeof change.owner === "object" && "Immutable" in change.owner) {
    return "Immutable";
  } else {
    return "";
  }
};
