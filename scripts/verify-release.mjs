import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { deployments } from "./deployment-tools.mjs";

const release = deployments;
const manifest = JSON.parse(
  readFileSync(path.join(release, "release.json"), "utf8"),
);
if (
  manifest.status !== "ready" ||
  Object.keys(manifest.applications).length !== 4
)
  throw new Error("Release is not complete");
for (const app of Object.values(manifest.applications)) {
  const entry = path.resolve(release, app.entry);
  if (!entry.startsWith(release + path.sep) || !existsSync(entry))
    throw new Error("Missing/invalid application entry");
  if (app.android) {
    const apk = path.resolve(release, app.android.entry);
    if (!apk.startsWith(release + path.sep) || !existsSync(apk))
      throw new Error("Missing/invalid Android package");
  }
}
for (const file of manifest.files) {
  const location = path.resolve(release, file.path);
  if (!location.startsWith(release + path.sep))
    throw new Error("Manifest path escapes release");
  const bytes = readFileSync(location);
  if (
    bytes.length !== file.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== file.sha256
  )
    throw new Error(`Release integrity failed: ${file.path}`);
}
console.log(
  `Verified ${manifest.id}: four apps, ${manifest.files.length} file checksums.`,
);
