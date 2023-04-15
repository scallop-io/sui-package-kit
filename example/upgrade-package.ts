/**
 * This is an example of using SuiKit to upgrade a move package
 */
import * as path from "path";
import * as dotenv from "dotenv";
import { SuiKit } from "@scallop-dao/sui-kit";
import { SuiPackagePublisher } from "../src";
dotenv.config();

(async() => {
  const mnemonics = process.env.MNEMONICS;
  const suiKit = new SuiKit({ mnemonics, networkType: 'devnet' });
  const balance = await suiKit.getBalance();
  if (parseInt(balance.totalBalance) <= 3000) {
    await suiKit.requestFaucet();
  }
  // Wait for 3 seconds before publish package
  await new Promise(resolve => setTimeout(() => resolve(true), 3000));

  const oldPkgId = '0x51f9ac9499e22a272c9017549eab24d808a3c64a9fccfaec9e89beb05edf2db2';
  const upgradeCapId = '0xba74e70a0769efd25cd2f527a4f34b8d706b7b4068894cc31294d005aadca8e9';
  const packagePath = path.join(__dirname, './sample_move/package_a_upgrade');
  const publisher = new SuiPackagePublisher();
  const result = await publisher.upgradePackage(packagePath, upgradeCapId, { skipFetchLatestGitDeps: true });
  console.log(result);
})();
