/**
 * This is an example of using SuiKit to upgrade a move package
 */
import * as path from "path";
import * as dotenv from "dotenv";
import { SuiKit } from "@scallop-dao/sui-kit";
import { SuiPackagePublisher } from "../src";
dotenv.config();

(async() => {
  const secretKey = process.env.SECRET_KEY;
  const suiKit = new SuiKit({ secretKey, networkType: 'localnet' });

  const oldPkgId = '0xcc77b8de275be5b0b45fa89cc20b31dcb5e7c7cb1bfdb91769994223fce60190';
  const upgradeCapId = '0xddcef41d727acf5ea2d7ce6cc973e259e9c45c8ac0c157583da125703a92692c';
  const packagePath = path.join(__dirname, './sample_move/package_a_upgrade');
  const publisher = new SuiPackagePublisher();
  const result = await publisher.upgradePackage({
    packagePath,
    oldPackageId: oldPkgId,
    upgradeCapId,
    signer: suiKit.getSigner(),
    options: { skipFetchLatestGitDeps: true }
    });
  console.log(result);
})();
