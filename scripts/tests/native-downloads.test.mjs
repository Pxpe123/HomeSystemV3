import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  prepareClientDownloads,
  verifyNativePackage,
} from "../prepare-client-downloads.mjs";

const expected = {
  version: "3.0.10+1.abcdef12",
  buildId: "123.1",
  commit: "a".repeat(40),
  builtAtUtc: "2026-10-18T00:00:00.000Z",
};
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "HomeSystem-Downloads-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const platform of ["windows", "android"]) {
    const directory = path.join(root, `display-client-${platform}`);
    mkdirSync(directory);
    const name =
      platform === "windows" ? "HomeSystem-Setup.exe" : "HomeSystem-debug.apk";
    const bytes = Buffer.from(`fake ${platform} test payload`);
    writeFileSync(path.join(directory, name), bytes);
    writeFileSync(
      path.join(directory, "build-info.json"),
      JSON.stringify({
        ...expected,
        platform,
        files: [
          {
            path: name,
            bytes: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          },
        ],
      }),
    );
  }
  return root;
}
test("matched native artifacts produce direct binaries, metadata and checksums", (t) => {
  const root = fixture(t);
  const output = prepareClientDownloads(root, expected);
  assert.match(
    readFileSync(path.join(output, "HomeSystem-debug.apk"), "utf8"),
    /fake android/,
  );
  assert.match(
    readFileSync(path.join(output, "HomeSystem-Setup.exe"), "utf8"),
    /fake windows/,
  );
  assert.equal(
    readFileSync(path.join(output, "SHA256SUMS.txt"), "utf8").trim().split("\n")
      .length,
    4,
  );
});
test("tampered binaries cannot be published", (t) => {
  const root = fixture(t);
  writeFileSync(
    path.join(root, "display-client-android/HomeSystem-debug.apk"),
    "tampered",
  );
  assert.throws(
    () => prepareClientDownloads(root, expected),
    /Checksum mismatch/,
  );
});
test("stale build identity cannot be published", (t) => {
  const root = fixture(t);
  assert.throws(
    () => prepareClientDownloads(root, { ...expected, commit: "b".repeat(40) }),
    /identity mismatch/,
  );
});
test("manifest path traversal and duplicate entries are rejected", (t) => {
  const root = fixture(t);
  const directory = path.join(root, "display-client-windows");
  const file = path.join(directory, "build-info.json");
  const manifest = JSON.parse(readFileSync(file));
  manifest.files.push({ ...manifest.files[0], path: "../outside" });
  writeFileSync(file, JSON.stringify(manifest));
  assert.throws(
    () => verifyNativePackage(directory, "windows", expected),
    /manifest path/,
  );
  manifest.files[1] = manifest.files[0];
  writeFileSync(file, JSON.stringify(manifest));
  assert.throws(
    () => verifyNativePackage(directory, "windows", expected),
    /manifest path/,
  );
});
