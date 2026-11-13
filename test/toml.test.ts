import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  parseMoveToml,
  replaceMoveTomlForNetworkType,
  restoreMoveToml,
  writeMoveToml,
} from "../src/lib/advance/toml";

const ORIGINAL = `[package]\nname = "a"\n\n[dependencies]\n\n[addresses]\na = "0x0"\n`;
const TESTNET = `[package]\nname = "a"\npublished-at = "0x1"\n\n[dependencies]\n\n[addresses]\na = "0x1"\n`;

let dir: string;
const read = (name: string) => fs.readFileSync(path.join(dir, name), "utf8");
const exists = (name: string) => fs.existsSync(path.join(dir, name));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "package-kit-toml-"));
  fs.writeFileSync(path.join(dir, "Move.toml"), ORIGINAL);
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("replaceMoveTomlForNetworkType / restoreMoveToml", () => {
  it("fails loudly when the network file does not exist, leaving Move.toml untouched", () => {
    expect(() => replaceMoveTomlForNetworkType(dir, "testnet")).toThrow(/Move\.testnet\.toml not found/);
    expect(read("Move.toml")).toBe(ORIGINAL);
    expect(exists("Move.toml.bak")).toBe(false);
  });

  it("swaps in the network file and keeps the original as a backup", () => {
    fs.writeFileSync(path.join(dir, "Move.testnet.toml"), TESTNET);
    replaceMoveTomlForNetworkType(dir, "testnet");
    expect(read("Move.toml")).toBe(TESTNET);
    expect(read("Move.toml.bak")).toBe(ORIGINAL);
  });

  it("restores the original and removes the backup", () => {
    fs.writeFileSync(path.join(dir, "Move.testnet.toml"), TESTNET);
    replaceMoveTomlForNetworkType(dir, "testnet");
    restoreMoveToml(dir);
    expect(read("Move.toml")).toBe(ORIGINAL);
    expect(exists("Move.toml.bak")).toBe(false);
  });

  it("does nothing when there is no backup to restore", () => {
    restoreMoveToml(dir);
    expect(read("Move.toml")).toBe(ORIGINAL);
  });
});

describe("parseMoveToml / writeMoveToml", () => {
  it("round-trips the package and addresses", () => {
    const parsed = parseMoveToml(path.join(dir, "Move.toml"));
    expect(parsed.package.name).toBe("a");
    expect(parsed.addresses).toEqual({ a: "0x0" });

    parsed.package["published-at"] = "0x42";
    const out = path.join(dir, "Move.devnet.toml");
    writeMoveToml(parsed, out);
    expect(parseMoveToml(out).package["published-at"]).toBe("0x42");
  });
});
