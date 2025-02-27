/**
 * This is an example of using SuiKit to upgrade a move package
 */
import * as path from "path";
import * as dotenv from "dotenv";
import { fromBase64 } from "@mysten/sui/utils";
import { SuiAdvancePackagePublisher } from "../src";
import { Dependencies } from "../src/lib/advance/upgrade-package-with-dependencies";
import { SuiKit } from "@scallop-io/sui-kit";
dotenv.config();

(async () => {
  const secretKey = process.env.SECRET_KEY;
  const suiKit = new SuiKit({ secretKey, networkType: "testnet" });

  const oldPkgId = "0x0eb24956c6a9b6a1dc8eba3e90f4f86776649fde7084d1531a6fdb3641016be6";
  const upgradeCapId = "0x903058cfdbba7d014bac3fe2c95619b7f6afca5d04466db2be1151add146c56f";
  const packagePath = path.join(__dirname, "./sample_move/package_a_upgrade");
  const dependencies: Dependencies = [{ packagePath: path.join(__dirname, "./sample_move/package_b") }];

  const publisher = new SuiAdvancePackagePublisher({ networkType: "testnet" });
  const tx = await publisher.createUpgradePackageTxWithDependencies(
    packagePath,
    oldPkgId,
    upgradeCapId,
    dependencies,
    suiKit.client(),
    suiKit.currentAddress()
  );

  const res = await suiKit.signAndSendTxn(fromBase64(tx.txBytesBase64));
  console.log(res);
  return res;
})();
