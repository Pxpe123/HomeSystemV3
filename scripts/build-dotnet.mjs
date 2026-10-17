import path from "node:path";
import { root, run } from "./deployment-tools.mjs";

const projects = {
  "control-server": "CentralServer.csproj",
  "desktop-agent": "PcAgent.csproj",
};
const app = process.argv[2];
if (!Object.hasOwn(projects, app))
  throw new Error("Choose control-server or desktop-agent");
const cwd = path.join(root, "apps", app);
// Run from the application so its own global.json selects the SDK.
run(
  "dotnet",
  ["restore", projects[app], "--configfile", "NuGet.Config", "--locked-mode"],
  process.env,
  cwd,
);
run(
  "dotnet",
  [
    "publish",
    projects[app],
    "-c",
    "Release",
    "--no-restore",
    "--no-self-contained",
  ],
  process.env,
  cwd,
);
