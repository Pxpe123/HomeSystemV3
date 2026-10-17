import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { buildDisplay, deployments, local, run } from "./deployment-tools.mjs";
import { createBuildInfo } from "../apps/web-ui/scripts/build-info.mjs";

const platform = process.argv[2];
if (!["windows", "android"].includes(platform))
  throw new Error("Choose windows or android");
if (process.platform !== "win32")
  throw new Error(
    "The native CI toolchains currently require a Windows runner",
  );

const output = path.join(deployments, "display-client", platform);
mkdirSync(output, { recursive: true });
if (platform === "windows") {
  buildDisplay(output);
} else {
  run(process.execPath, ["scripts/build-android.mjs"]);
  copyFileSync(
    path.join(
      local,
      "packages/display-client/android-arm64-debug/HomeSystem-debug.apk",
    ),
    path.join(output, "HomeSystem-debug.apk"),
  );
}

// Ship identity and hashes alongside each downloadable package, without credentials.
function hashes(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = path.join(directory, entry.name);
      const relative = prefix + entry.name;
      if (!prefix && relative === "build-info.json") return [];
      if (entry.isDirectory()) return hashes(file, relative + "/");
      const bytes = readFileSync(file);
      return [
        {
          path: relative,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      ];
    });
}
const files = hashes(output);
const entrypoint =
  platform === "windows" ? "bin/HomeSystemV3.exe" : "HomeSystem-debug.apk";
if (!files.some((file) => file.path === entrypoint && file.bytes > 0))
  throw new Error(`Native build is missing ${entrypoint}`);
writeFileSync(
  path.join(output, "build-info.json"),
  JSON.stringify(
    {
      ...createBuildInfo(),
      platform,
      architecture: platform === "windows" ? "x64" : "arm64-v8a",
      signing: platform === "android" ? "debug-only" : "unsigned",
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Packaged ${platform}: ${output} (${files.length} verified files)`);
