import type { ClientWithCoreApi } from "@mysten/sui/client";
import { bcs } from "@mysten/sui/bcs";
import { Transaction, UpgradePolicy } from "@mysten/sui/transactions";
import type { SuiKit } from "@scallop-io/sui-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPackage } from "../src/lib/build-package";
import { createPublishTx, publishPackage } from "../src/lib/publish-package";
import { createUpgradePackageTx, upgradePackage } from "../src/lib/upgrade-package";
import { executeInclude } from "../src/lib/sui-response-parser";
import {
  SENDER,
  UPGRADE_CAP_TYPE,
  address,
  changed,
  created,
  createdPackage,
  failed,
  makeTxn,
  succeeded,
} from "./fixtures";

vi.mock("../src/lib/build-package", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/build-package")>()),
  buildPackage: vi.fn(),
}));

const OLD_PACKAGE = "0x" + "1".repeat(64);
const UPGRADE_CAP = "0x" + "2".repeat(64);
const pureBytes = (tx: Transaction) =>
  tx.getData().inputs.flatMap((input) => (input.$kind === "Pure" ? [input.Pure.bytes] : []));
const commandKinds = (tx: Transaction) => tx.getData().commands.map((c) => c.$kind);

const execute = vi.fn();
const keypair = {} as never;
const client = { core: { signAndExecuteTransaction: execute } } as unknown as ClientWithCoreApi;
const suiKit = { currentAddress: SENDER, getKeypair: () => keypair, client } as unknown as SuiKit;

// the transaction handed to the (fake) network
const sentTx = () => execute.mock.calls[0][0].transaction as Transaction;

beforeEach(() => {
  execute.mockReset();
  vi.mocked(buildPackage).mockReturnValue({ modules: ["AQID"], dependencies: ["0x1", "0x2"], digest: [1, 2, 3] });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("publishPackage", () => {
  const publishedTxn = makeTxn(
    [createdPackage("0xpkg"), created("0xcap", address(SENDER))],
    { "0xcap": UPGRADE_CAP_TYPE }
  );

  it("publishes, then sends the upgrade cap to the signer so it is not left unused", async () => {
    execute.mockResolvedValue(succeeded(publishedTxn));
    await publishPackage("sui", "/pkgs/a", suiKit);

    expect(commandKinds(sentTx())).toEqual(["Publish", "TransferObjects"]);
    expect(pureBytes(sentTx())).toContain(bcs.Address.serialize(SENDER).toBase64());
    expect(execute.mock.calls[0][0]).toMatchObject({ signer: keypair, include: executeInclude });
  });

  it("returns the parsed ids on success", async () => {
    execute.mockResolvedValue(succeeded(publishedTxn));
    const res = await publishPackage("sui", "/pkgs/a", suiKit);
    expect(res).toMatchObject({ packageId: "0xpkg", upgradeCapId: "0xcap", publishTxn: publishedTxn });
  });

  it("returns empty ids, plus the transaction, when the network reports failure", async () => {
    const failedTxn = makeTxn([], {}, { success: false });
    execute.mockResolvedValue(failed(failedTxn));
    const res = await publishPackage("sui", "/pkgs/a", suiKit);
    expect(res).toEqual({ packageId: "", upgradeCapId: "", publisherIds: [], created: [], publishTxn: failedTxn });
  });
});

describe("upgradePackage", () => {
  const upgradedTxn = makeTxn(
    [createdPackage("0xnewpkg"), changed("0xcap", { outputOwner: address(SENDER) })],
    { "0xcap": UPGRADE_CAP_TYPE }
  );
  const run = () => upgradePackage("sui", "/pkgs/a", OLD_PACKAGE, UPGRADE_CAP, client, keypair);

  it("authorizes, upgrades, then commits, using the COMPATIBLE policy", async () => {
    execute.mockResolvedValue(succeeded(upgradedTxn));
    await run();

    const tx = sentTx();
    expect(commandKinds(tx)).toEqual(["MoveCall", "Upgrade", "MoveCall"]);
    const [authorize, , commit] = tx.getData().commands;
    expect(authorize.MoveCall).toMatchObject({ module: "package", function: "authorize_upgrade" });
    expect(commit.MoveCall).toMatchObject({ module: "package", function: "commit_upgrade" });
    expect(pureBytes(tx)).toContain(bcs.u8().serialize(UpgradePolicy.COMPATIBLE).toBase64());
  });

  it("returns the new package id and the upgrade cap on success", async () => {
    execute.mockResolvedValue(succeeded(upgradedTxn));
    expect(await run()).toMatchObject({ packageId: "0xnewpkg", upgradeCapId: "0xcap" });
  });

  it("returns empty ids when the network reports failure", async () => {
    execute.mockResolvedValue(failed(makeTxn([], {}, { success: false })));
    expect(await run()).toMatchObject({ packageId: "", upgradeCapId: "" });
  });
});

describe("createPublishTx / createUpgradePackageTx", () => {
  beforeEach(() => {
    vi.spyOn(Transaction.prototype, "build").mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  // Transaction bytes are signed later (e.g. by a multisig), so they must not expire with the epoch
  it.each([
    ["publish", () => createPublishTx("sui", "/pkgs/a", client, SENDER)],
    ["upgrade", () => createUpgradePackageTx("sui", "/pkgs/a", OLD_PACKAGE, UPGRADE_CAP, client, SENDER)],
  ])("%s: sets the sender, removes the expiration and returns base64 bytes", async (_name, create) => {
    const { txBytesBase64, tx } = await create();
    expect(txBytesBase64).toBe("AQID");
    expect(tx.getData().sender).toBe(SENDER);
    expect(tx.getData().expiration).toMatchObject({ None: true });
    expect(Transaction.prototype.build).toHaveBeenCalledWith({ client });
  });
});
