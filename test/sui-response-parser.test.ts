import { describe, expect, it } from "vitest";
import { parsePublishTxn, parseUpgradeTxn, unwrapResult } from "../src/lib/sui-response-parser";
import {
  PUBLISHER_TYPE,
  SENDER,
  UPGRADE_CAP_TYPE,
  address,
  changed,
  consensus,
  created,
  createdPackage,
  failed,
  immutable,
  makeTxn,
  shared,
  succeeded,
} from "./fixtures";

describe("parsePublishTxn", () => {
  const txn = makeTxn(
    [
      createdPackage("0xpkg"),
      created("0xcap", address(SENDER)),
      created("0xpublisher", address(SENDER)),
      created("0xmine", address(SENDER)),
      created("0xtheirs", address("0xb0b")),
      created("0xshared", shared),
      created("0xfrozen", immutable),
      created("0xconsensus", consensus("0xc0c")),
      // the gas coin is mutated by every transaction; callers must not see it as "created"
      changed("0xgas", { outputOwner: address(SENDER) }),
    ],
    {
      "0xcap": UPGRADE_CAP_TYPE,
      "0xpublisher": PUBLISHER_TYPE,
      "0xmine": "0xabc::m::Thing",
      "0xtheirs": "0xabc::m::Thing",
      "0xshared": "0xabc::m::Pool",
      "0xfrozen": "0xabc::m::Config",
      "0xconsensus": "0xabc::m::Vault",
      "0xgas": "0x2::coin::Coin<0x2::sui::SUI>",
    }
  );

  it("finds the new package, upgrade cap and publisher", () => {
    const res = parsePublishTxn(txn);
    expect(res.packageId).toBe("0xpkg");
    expect(res.upgradeCapId).toBe("0xcap");
    expect(res.publisherIds).toEqual(["0xpublisher"]);
  });

  it("lists only user objects as created, with readable owners", () => {
    const { created } = parsePublishTxn(txn);
    expect(created).toEqual([
      { type: "0xabc::m::Thing", objectId: "0xmine", owner: `(you) ${SENDER}` },
      { type: "0xabc::m::Thing", objectId: "0xtheirs", owner: "0xb0b" },
      { type: "0xabc::m::Pool", objectId: "0xshared", owner: "Shared" },
      { type: "0xabc::m::Config", objectId: "0xfrozen", owner: "Immutable" },
      { type: "0xabc::m::Vault", objectId: "0xconsensus", owner: "0xc0c" },
    ]);
  });

  it("does not mark an owner as (you) when the sender is unknown", () => {
    const noSender = makeTxn([created("0xmine", address(SENDER))], { "0xmine": "0xabc::m::Thing" }, { sender: null });
    expect(parsePublishTxn(noSender).created[0].owner).toBe(SENDER);
  });

  it("returns empty ids when nothing was published", () => {
    expect(parsePublishTxn(makeTxn([], {}))).toEqual({
      packageId: "",
      upgradeCapId: "",
      publisherIds: [],
      created: [],
    });
  });
});

describe("parseUpgradeTxn", () => {
  it("returns the NEW package id and the (mutated, not created) upgrade cap", () => {
    const txn = makeTxn(
      [
        createdPackage("0xnewpkg"),
        // an upgrade mutates the cap in place, so it is not "Created"
        changed("0xcap", { outputOwner: address(SENDER) }),
        changed("0xgas", { outputOwner: address(SENDER) }),
      ],
      { "0xcap": UPGRADE_CAP_TYPE, "0xgas": "0x2::coin::Coin<0x2::sui::SUI>" }
    );
    expect(parseUpgradeTxn(txn)).toEqual({ packageId: "0xnewpkg", upgradeCapId: "0xcap" });
  });

  it("returns empty ids when the effects hold no package", () => {
    expect(parseUpgradeTxn(makeTxn([], {}))).toEqual({ packageId: "", upgradeCapId: "" });
  });
});

describe("unwrapResult", () => {
  it("returns the transaction on success", () => {
    const txn = makeTxn([], {});
    expect(unwrapResult(succeeded(txn))).toBe(txn);
  });

  it("returns the failed transaction instead of throwing, so callers can report it", () => {
    const txn = makeTxn([], {}, { success: false });
    const out = unwrapResult(failed(txn));
    expect(out).toBe(txn);
    expect(out.status.success).toBe(false);
  });
});
