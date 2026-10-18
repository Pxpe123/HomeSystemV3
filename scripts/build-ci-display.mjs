import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  buildDisplay,
  displayToolchain,
  deployments,
  local,
  root,
  run,
} from "./deployment-tools.mjs";
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
  const tools = displayToolchain();
  buildDisplay(output, tools);
  const redist = Object.entries(tools.env).find(
    ([key]) => key.toLowerCase() === "vctoolsredistdir",
  )?.[1];
  if (!redist) throw new Error("MSVC redistributable directory is missing");
  const redistX64 = path.join(redist, "x64");
  const crtName = readdirSync(redistX64).find((name) =>
    /^Microsoft\.VC\d+\.CRT$/i.test(name),
  );
  if (!crtName) throw new Error("MSVC x64 CRT package is missing");
  const crt = path.join(redistX64, crtName);
  for (const entry of readdirSync(crt).filter((file) => file.endsWith(".dll")))
    copyFileSync(path.join(crt, entry), path.join(output, "bin", entry));
  for (const file of ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll"])
    if (!existsSync(path.join(output, "bin", file)))
      throw new Error(`Missing runtime: ${file}`);
  const compiler =
    process.env.HOMESYSTEM_ISCC || path.join(local, "tools/inno/ISCC.exe");
  if (!existsSync(compiler))
    throw new Error("Run scripts/setup-inno.ps1 before packaging Windows");
  run(compiler, [
    `/DPackageRoot=${output}`,
    `/DPackageVersion=${createBuildInfo().version.split("+")[0].split("-")[0]}`,
    path.join(root, "apps/display-client/packaging/windows.iss"),
  ]);
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
  platform === "windows" ? "HomeSystem-Setup.exe" : "HomeSystem-debug.apk";
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
