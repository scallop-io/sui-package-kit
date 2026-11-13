import type { SuiClientTypes } from "@mysten/sui/client";
import type { ExecutedTransaction, ExecuteResult } from "../src/lib/sui-response-parser";

export const SENDER = "0x" + "a".repeat(64);

type Change = SuiClientTypes.ChangedObject;

export const address = (owner: string): Change["outputOwner"] => ({ $kind: "AddressOwner", AddressOwner: owner }) as Change["outputOwner"];
export const shared: Change["outputOwner"] = { $kind: "Shared", Shared: { initialSharedVersion: "1" } } as Change["outputOwner"];
export const immutable: Change["outputOwner"] = { $kind: "Immutable", Immutable: true } as Change["outputOwner"];
export const consensus = (owner: string): Change["outputOwner"] =>
  ({ $kind: "ConsensusAddressOwner", ConsensusAddressOwner: { startVersion: "1", owner } }) as Change["outputOwner"];

/** A changed object as the core API reports it; override only what a test cares about */
export const changed = (objectId: string, overrides: Partial<Change> = {}): Change => ({
  objectId,
  inputState: "DoesNotExist",
  inputVersion: null,
  inputDigest: null,
  inputOwner: null,
  outputState: "ObjectWrite",
  outputVersion: "1",
  outputDigest: "digest",
  outputOwner: null,
  idOperation: "None",
  ...overrides,
});

export const created = (objectId: string, outputOwner: Change["outputOwner"]) =>
  changed(objectId, { idOperation: "Created", outputOwner });

export const createdPackage = (objectId: string) =>
  changed(objectId, { idOperation: "Created", outputState: "PackageWrite", outputOwner: immutable });

export const makeTxn = (
  changedObjects: Change[],
  objectTypes: Record<string, string>,
  { sender = SENDER as string | null, success = true } = {}
) =>
  ({
    digest: "digest",
    signatures: [],
    epoch: "1",
    timestampMs: null,
    checkpoint: null,
    status: success ? { success: true, error: null } : { success: false, error: { message: "boom" } },
    balanceChanges: undefined,
    effects: { changedObjects },
    events: undefined,
    objectTypes,
    transaction: { sender },
    bcs: undefined,
  }) as unknown as ExecutedTransaction;

export const succeeded = (txn: ExecutedTransaction) => ({ $kind: "Transaction", Transaction: txn }) as unknown as ExecuteResult;
export const failed = (txn: ExecutedTransaction) =>
  ({ $kind: "FailedTransaction", FailedTransaction: txn }) as unknown as ExecuteResult;

export const UPGRADE_CAP_TYPE = "0x2::package::UpgradeCap";
export const PUBLISHER_TYPE = "0x2::package::Publisher";
