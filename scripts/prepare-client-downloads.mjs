import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createBuildInfo } from "../apps/web-ui/scripts/build-info.mjs";

export function verifyNativePackage(directory, platform, expected) {
  const manifest = JSON.parse(
    readFileSync(path.join(directory, "build-info.json"), "utf8"),
  );
  for (const field of ["version", "buildId", "commit", "builtAtUtc"])
    if (!expected[field] || manifest[field] !== expected[field])
      throw new Error(`${platform} build identity mismatch: ${field}`);
  if (manifest.platform !== platform || !Array.isArray(manifest.files))
    throw new Error(`Invalid ${platform} manifest`);
  const entrypoint =
    platform === "windows" ? "HomeSystem-Setup.exe" : "HomeSystem-debug.apk";
  if (
    !manifest.files.some((file) => file.path === entrypoint && file.bytes > 0)
  )
    throw new Error(`Missing ${platform} download: ${entrypoint}`);
  const seen = new Set();
  for (const file of manifest.files) {
    if (
      typeof file.path !== "string" ||
      !file.path ||
      file.path.includes("\\") ||
      path.posix.isAbsolute(file.path) ||
      file.path
        .split("/")
        .some((part) => !part || part === "." || part === "..") ||
      /^[a-z]:/i.test(file.path) ||
      seen.has(file.path)
    )
      throw new Error("Invalid or duplicate manifest path");
    seen.add(file.path);
    const bytes = readFileSync(path.join(directory, file.path));
    if (
      bytes.length !== file.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== file.sha256
    )
      throw new Error(`Checksum mismatch: ${file.path}`);
  }
  return { manifest, entrypoint };
}

export function prepareClientDownloads(
  directory,
  expected = createBuildInfo(),
) {
  // Verify both packages before preparing anything for public download.
  const packages = ["windows", "android"].map((platform) => {
    const source = path.join(directory, `display-client-${platform}`);
    return {
      platform,
      source,
      ...verifyNativePackage(source, platform, expected),
    };
  });
  const output = path.join(directory, "release");
  mkdirSync(output, { recursive: true });
  const checksums = [];
  for (const { platform, source, manifest, entrypoint } of packages) {
    copyFileSync(path.join(source, entrypoint), path.join(output, entrypoint));
    const metadata = `${platform}-build-info.json`;
    copyFileSync(
      path.join(source, "build-info.json"),
      path.join(output, metadata),
    );
    for (const name of [entrypoint, metadata])
      checksums.push(
        `${createHash("sha256")
          .update(readFileSync(path.join(output, name)))
          .digest("hex")}  ${name}`,
      );
    console.log(
      `Verified ${platform}: ${manifest.files.length} files, ${manifest.commit}`,
    );
  }
  writeFileSync(
    path.join(output, "SHA256SUMS.txt"),
    checksums.join("\n") + "\n",
  );
  return output;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.argv[2])
    throw new Error("Specify the downloaded native artifact directory");
  prepareClientDownloads(path.resolve(process.argv[2]));
}
