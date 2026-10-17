import path from "node:path";
import { buildDisplay, deployments } from "./deployment-tools.mjs";

try {
  buildDisplay(path.join(deployments, "display-client"));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
