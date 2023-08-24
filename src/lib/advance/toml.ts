import * as fs from 'fs';
import * as path from "path";
import * as toml from '@iarna/toml';
import type { NetworkType } from "./network-type";

type MoveToml = {
  package: Record<string, any>;
  dependencies: Record<string, any>;
  addresses: Record<string, any>;
  ['devnet-addresses']?: Record<string, any>;
  ['testnet-addresses']?: Record<string, any>;
  ['mainnet-addresses']?: Record<string, any>;
  ['localnet-addresses']?: Record<string, any>;
}

export const parseMoveToml = (tomlPath: string) => {
  // Read the TOML file
  const tomlStr = fs.readFileSync(tomlPath, 'utf8');
  // Parse the TOML file
  const parsedToml = toml.parse(tomlStr);
  return parsedToml as MoveToml;
}

export const writeMoveToml = (tomlContent: MoveToml, outPath: string) => {
  let tomlFileContent = toml.stringify(tomlContent);
  fs.writeFileSync(outPath, tomlFileContent);
}

/**
 *
 * Replace the `Move.toml` file with the `Move.${networkType}.toml` file
 * And make a backup of the `Move.toml` file as `Move.toml.bak`
 * @param pkgPath path to the move package
 * @param networkType 'devnet' | 'testnet' | 'mainnet' | 'localnet'
 */
export const replaceMoveTomlForNetworkType = (pkgPath: string, networkType: NetworkType) => {
  const tomlPathForNetwork= path.join(pkgPath, `Move.${networkType}.toml`);
  if (!fs.existsSync(tomlPathForNetwork)) {
    throw new Error(`Move.${networkType}.toml not found in ${pkgPath}`);
  }

  const backupMoveTomlPath = path.join(pkgPath, "Move.toml.bak");
  fs.cpSync(path.join(pkgPath, "Move.toml"), backupMoveTomlPath);

  fs.cpSync(tomlPathForNetwork, path.join(pkgPath, "Move.toml"));
}

/**
 * Restore the `Move.toml` file from the backup file `Move.toml.bak`
 * @param pkgPath path to the move package
 */
export const restoreMoveToml = (pkgPath: string) => {
  const backupMoveTomlPath = path.join(pkgPath, "Move.toml.bak");
  if (!fs.existsSync(backupMoveTomlPath)) return;
  fs.cpSync(backupMoveTomlPath, path.join(pkgPath, "Move.toml"));
  fs.rmSync(backupMoveTomlPath);
}
