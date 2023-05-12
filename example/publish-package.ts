/**
 * This is an example of using SuiKit and Sui Package Kit to publish a move package
 */
import * as path from "path";
import * as dotenv from "dotenv";
import { SuiKit } from "@scallop-io/sui-kit";
import { SuiPackagePublisher } from "../src";
dotenv.config();

(async() => {
  const secretKey = process.env.SECRET_KEY;
  const suiKit = new SuiKit({ secretKey, networkType: 'devnet' });

  const packagePath = path.join(__dirname, './sample_move/package_a');
  const publisher = new SuiPackagePublisher();

  const result = await publisher.publishPackage(packagePath, suiKit.getSigner(), { skipFetchLatestGitDeps: true });
  console.log(result);
})();
