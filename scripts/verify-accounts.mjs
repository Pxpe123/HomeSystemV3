import path from "node:path";
import { root, run } from "./deployment-tools.mjs";

const cwd = path.join(root, "apps/control-server");
run(
  "dotnet",
  [
    "restore",
    "HomeSystem.sln",
    "--configfile",
    "NuGet.Config",
    "--locked-mode",
  ],
  process.env,
  cwd,
);
run(
  "dotnet",
  [
    "run",
    "--project",
    "tests/AccountTests.csproj",
    "-c",
    "Release",
    "--no-restore",
  ],
  process.env,
  cwd,
);
run(process.execPath, ["tests/verify-accounts.mjs"], process.env, cwd);
