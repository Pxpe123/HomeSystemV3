import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  statSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  root,
  deployments,
  local,
  staging,
  run,
  npm,
  displayToolchain,
  buildDisplay,
} from "./deployment-tools.mjs";
import { createBuildInfo } from "../apps/web-ui/scripts/build-info.mjs";

const build = createBuildInfo();
Object.assign(process.env, {
  HOMESYSTEM_BUILD_VERSION: build.version,
  HOMESYSTEM_BUILD_ID: build.buildId,
  HOMESYSTEM_BUILD_COMMIT: build.commit,
  HOMESYSTEM_BUILD_TIME_UTC: build.builtAtUtc,
});

const id = "current";
const includeAndroid = process.argv.includes("--android");
const release = path.join(staging, "next");
const previous = path.join(staging, "previous");
if (existsSync(release) || existsSync(previous))
  throw new Error(
    "An unfinished build remains in .local/staging. Inspect it before rebuilding.",
  );
const manifest = {
  schemaVersion: 1,
  id,
  createdAt: new Date().toISOString(),
  platform: process.platform,
  architecture: process.arch,
  status: "building",
  applications: {},
  requirements: [
    ".NET 9 ASP.NET runtime for server",
    ".NET 9 runtime and Windows for desktop agent",
    "Qt kit target OS and Visual C++ runtime where applicable",
  ],
};
function record() {
  writeFileSync(
    path.join(release, "release.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
manifest.build = build;
function hashes(directory, prefix = "") {
  return readdirSync(directory)
    .sort()
    .flatMap((name) => {
      if (!prefix && name === "release.json") return [];
      const file = path.join(directory, name);
      const relative = prefix + name;
      return statSync(file).isDirectory()
        ? hashes(file, relative + "/")
        : [
            {
              path: relative,
              bytes: statSync(file).size,
              sha256: createHash("sha256")
                .update(readFileSync(file))
                .digest("hex"),
            },
          ];
    });
}
try {
  // Preflight and quality gates before creating a release directory.
  const tools = displayToolchain();
  run(process.execPath, ["scripts/check-layout.mjs"]);
  npm(["--prefix", "apps/web-ui", "run", "lint"]);
  npm(["--prefix", "apps/web-ui", "test"]);
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
    path.join(root, "apps/control-server"),
  );
  run(process.execPath, ["scripts/verify-accounts.mjs"]);
  mkdirSync(release, { recursive: true });
  record();
  for (const [name, project] of [
    ["control-server", "CentralServer"],
    ["desktop-agent", "PcAgent"],
  ]) {
    run(
      "dotnet",
      [
        "publish",
        project + ".csproj",
        "-c",
        "Release",
        "--no-restore",
        "--no-self-contained",
        "-p:UseAppHost=false",
        "-o",
        path.join(release, name),
      ],
      process.env,
      path.join(root, "apps", name),
    );
    manifest.applications[name] = {
      status: "built",
      entry: `${name}/${project}.dll`,
    };
    record();
  }
  const webOutput = path.join(release, "web-ui");
  const webEnv = { HOMESYSTEM_WEB_OUT_DIR: webOutput };
  npm(["--prefix", "apps/web-ui", "run", "build"], webEnv);
  run(process.execPath, ["apps/web-ui/scripts/verify-build.mjs"], {
    ...process.env,
    ...webEnv,
  });
  manifest.applications["web-ui"] = {
    status: "built",
    entry: "web-ui/index.html",
  };
  record();
  buildDisplay(path.join(release, "display-client"), tools);
  manifest.applications["display-client"] = {
    status: "built",
    entry:
      process.platform === "win32"
        ? "display-client/bin/HomeSystemV3.exe"
        : "display-client/bin/HomeSystemV3",
  };
  if (includeAndroid) {
    run(process.execPath, ["scripts/build-android.mjs"]);
    const android = path.join(release, "display-client/android");
    mkdirSync(android);
    copyFileSync(
      path.join(
        local,
        "packages/display-client/android-arm64-debug/HomeSystem-debug.apk",
      ),
      path.join(android, "HomeSystem-debug.apk"),
    );
    manifest.applications["display-client"].android = {
      entry: "display-client/android/HomeSystem-debug.apk",
      abi: "arm64-v8a",
      signing: "debug-only",
    };
  }
  const infra = path.join(release, "infra");
  mkdirSync(infra);
  copyFileSync(
    path.join(root, "apps/control-server/Dockerfile.artifact"),
    path.join(infra, "Dockerfile.server"),
  );
  copyFileSync(
    path.join(root, "apps/web-ui/Dockerfile.artifact"),
    path.join(infra, "Dockerfile.ui"),
  );
  copyFileSync(
    path.join(root, "apps/web-ui/nginx.conf"),
    path.join(infra, "nginx.conf"),
  );
  copyFileSync(
    path.join(root, "scripts/deployment/.env.example"),
    path.join(release, ".env.example"),
  );
  const compose = readFileSync(
    path.join(root, "scripts/deployment/compose.yaml"),
    "utf8",
  )
    .replaceAll("\r\n", "\n")
    .replace(
      "context: ../../apps/control-server\n      dockerfile: Dockerfile",
      "context: ..\n      dockerfile: infra/Dockerfile.server",
    )
    .replace(
      "context: ../../apps/web-ui\n      dockerfile: Dockerfile",
      "context: ..\n      dockerfile: infra/Dockerfile.ui",
    )
    .replaceAll(":-dev}", `:-${id}}`);
  if (/context:\s*.*apps\//.test(compose))
    throw new Error("Release compose still references source folders");
  writeFileSync(path.join(infra, "compose.yaml"), compose);
  writeFileSync(
    path.join(release, "README.md"),
    `# HomeSystem release ${id}\n\nVerify release.json checksums before rollout. Configure a local .env from .env.example, then from this bundle run:\n\n    docker compose --env-file .env -f infra/compose.yaml up --build -d\n\nThe server/UI use the existing homesystem network and homesystem-data volume; never remove the volume to roll back. Keep the previous bundle and database backup. The desktop-agent requires Windows and .NET 9; the display client requires its target OS and the Visual C++ runtime (installer included where Qt provides it). Display URL: --url http://YOUR-SERVER:8088 or HOMESYSTEM_UI_URL. No secrets are included and no live deployment was performed by the build.\n`,
  );
  manifest.files = hashes(release);
  manifest.status = "ready";
  manifest.completedAt = new Date().toISOString();
  record();
  // Promote only complete builds. Keep displaced output temporarily for rollback.
  mkdirSync(previous, { recursive: true });
  mkdirSync(deployments, { recursive: true });
  const promoted = [];
  const displaced = [];
  try {
    for (const name of readdirSync(release)) {
      const target = path.join(deployments, name);
      if (existsSync(target)) {
        renameSync(target, path.join(previous, name));
        displaced.push(name);
      }
      renameSync(path.join(release, name), target);
      promoted.push(name);
    }
  } catch (error) {
    for (const name of promoted.reverse())
      renameSync(path.join(deployments, name), path.join(release, name));
    for (const name of displaced.reverse())
      renameSync(path.join(previous, name), path.join(deployments, name));
    throw error;
  }
  rmSync(previous, { recursive: true });
  rmSync(release, { recursive: true });
  console.log(`Build ready: ${deployments}`);
  console.log(
    "Current app folders replaced only after all builds succeeded. Nothing was deployed to a live device.",
  );
} catch (error) {
  if (existsSync(release)) {
    manifest.status = "failed";
    manifest.error = error.message;
    record();
  }
  console.error(error.message);
  process.exitCode = 1;
}
