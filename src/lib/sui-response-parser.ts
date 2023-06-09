// @ts-nocheck
import {SuiTransactionBlockResponse, getObjectChanges, SuiObjectChange} from "@mysten/sui.js";

export const parsePublishTxn = (suiResponse: SuiTransactionBlockResponse) => {
  const objectChanges = getObjectChanges(suiResponse);
  const parseRes = {
    packageId: '',
    upgradeCapId: '',
    publisherIds: [] as string[],
    created: [] as { type: string; objectId: string, owner: string }[],
  }
  if (objectChanges) {
    for (const change of objectChanges) {
      if (change.type === 'created' && change.objectType.endsWith('package::UpgradeCap')) {
        parseRes.upgradeCapId = change.objectId;
      } else if (change.type === 'created' && change.objectType.endsWith('package::Publisher')) {
        parseRes.publisherIds.push(change.objectId);
      } else if (change.type === 'published') {
        parseRes.packageId = change.packageId;
      } else if (change.type === 'created') {
        const owner = parseOwnerFromObjectChange(change)
        parseRes.created.push({ type: change.objectType, objectId: change.objectId, owner });
      }
    }
  }
  return parseRes;
}

export const parseUpgradeTxn = (suiResponse: SuiTransactionBlockResponse) => {
  const objectChanges = getObjectChanges(suiResponse);
  const parseRes = { packageId: '', upgradeCapId: '' };
  if (objectChanges) {
    for (const change of objectChanges) {
      if (change.type === 'published') {
        parseRes.packageId = change.packageId;
      } else if (change.objectType.endsWith('package::UpgradeCap')) {
        parseRes.upgradeCapId = change.objectId;
      }
    }
  }
  return parseRes;
}

const parseOwnerFromObjectChange = (change: SuiObjectChange) => {
  const sender = change?.sender;
  if (change?.owner?.AddressOwner) {
    return (change.owner.AddressOwner === sender) ? `(you) ${sender}` : change.owner.AddressOwner;
  } else if (change?.owner?.Shared) {
    return 'Shared';
  } else if (change?.owner === 'Immutable') {
    return 'Immutable';
  }
  return '';
}
