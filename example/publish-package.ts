/**
 * This is an example of using SuiKit and Sui Package Kit to publish a move package
 */
import * as path from "path";
import * as dotenv from "dotenv";
import { SuiKit } from "@scallop-io/sui-kit";
import { SuiAdvancePackagePublisher, PackageBatch } from "../src";
dotenv.config();

(async() => {
  const secretKey = process.env.SECRET_KEY;
  const suiKit = new SuiKit({ secretKey, networkType: 'testnet' });

  let advancedPublisher = new SuiAdvancePackagePublisher({ networkType: 'testnet' });

  const packageBatch: PackageBatch = [
    { packagePath: path.join(__dirname, './sample_move/package_b'), option: { enforce: true } },
    { packagePath: path.join(__dirname, './sample_move/package_a'), option: { enforce: true } }
  ]

  const result = await advancedPublisher.publishPackageBatch(packageBatch, suiKit);
  console.log(result);
})();
