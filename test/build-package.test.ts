import { execSync } from "child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPackage } from "../src/lib/build-package";

vi.mock("child_process", () => ({ execSync: vi.fn() }));

const exec = vi.mocked(execSync);
const buildOutput = JSON.stringify({ modules: ["AQID"], dependencies: ["0x1", "0x2"], digest: [1, 2, 3] });

const lastCommand = () => String(exec.mock.calls.at(-1)?.[0]);

describe("buildPackage", () => {
  beforeEach(() => {
    exec.mockReset();
    exec.mockReturnValue(buildOutput);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("runs `<sui> move build` on the package path and parses the JSON output", () => {
    const res = buildPackage("/bin/sui", "/pkgs/a");
    expect(lastCommand()).toContain("/bin/sui move build --dump-bytecode-as-base64 --path /pkgs/a");
    expect(res).toEqual({ modules: ["AQID"], dependencies: ["0x1", "0x2"], digest: [1, 2, 3] });
  });

  it("passes --with-unpublished-dependencies by default", () => {
    buildPackage("sui", "/pkgs/a");
    expect(lastCommand()).toContain("--with-unpublished-dependencies");
  });

  // Sui CLI 1.68 rejects this flag, so callers must be able to turn it off
  it("leaves out --with-unpublished-dependencies when disabled", () => {
    buildPackage("sui", "/pkgs/a", { withUnpublishedDependencies: false });
    expect(lastCommand()).not.toContain("--with-unpublished-dependencies");
  });

  it("adds --skip-fetch-latest-git-deps only when asked", () => {
    buildPackage("sui", "/pkgs/a", { skipFetchLatestGitDeps: true });
    expect(lastCommand()).toContain("--skip-fetch-latest-git-deps");

    buildPackage("sui", "/pkgs/a", { skipFetchLatestGitDeps: false });
    expect(lastCommand()).not.toContain("--skip-fetch-latest-git-deps");
  });

  it("throws with the CLI output when the build fails", () => {
    exec.mockImplementation(() => {
      throw Object.assign(new Error("exit 1"), { stdout: "error[E01002]: unexpected token" });
    });
    expect(() => buildPackage("sui", "/pkgs/a")).toThrow(/error building package at \/pkgs\/a[\s\S]*E01002/);
  });
});
