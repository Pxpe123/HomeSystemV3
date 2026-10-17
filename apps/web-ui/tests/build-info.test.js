import assert from "node:assert/strict";
import test from "node:test";
import { createBuildInfo } from "../scripts/build-info.mjs";
import {
  compareBuilds,
  formatBuildTime,
} from "../src/plugins/settings/ui/buildDetails.js";

const env = {
  GITHUB_SHA: "a".repeat(40),
  GITHUB_RUN_NUMBER: "27",
  GITHUB_RUN_ID: "900",
  GITHUB_RUN_ATTEMPT: "2",
};
const now = new Date("2026-10-17T17:00:00.000Z");
test("build identity increments per GitHub build and distinguishes reruns", () => {
  const build = createBuildInfo(env, now);
  assert.equal(build.version, "3.0.27+2.aaaaaaaa");
  assert.equal(build.buildId, "900.2");
  assert.equal(build.builtAtUtc, now.toISOString());
  assert.notEqual(
    build.version,
    createBuildInfo({ ...env, GITHUB_RUN_NUMBER: "28" }, now).version,
  );
  assert.notEqual(
    build.buildId,
    createBuildInfo({ ...env, GITHUB_RUN_ATTEMPT: "3" }, now).buildId,
  );
});
test("shared metadata survives independent artifact builds and invalid input fails", () => {
  const build = createBuildInfo(env, now);
  assert.deepEqual(
    createBuildInfo(
      {
        HOMESYSTEM_BUILD_VERSION: build.version,
        HOMESYSTEM_BUILD_ID: build.buildId,
        HOMESYSTEM_BUILD_COMMIT: build.commit,
        HOMESYSTEM_BUILD_TIME_UTC: build.builtAtUtc,
      },
      new Date(),
    ),
    build,
  );
  assert.throws(() =>
    createBuildInfo({ HOMESYSTEM_BUILD_COMMIT: "not-a-sha" }, now),
  );
  assert.throws(() =>
    createBuildInfo({ HOMESYSTEM_BUILD_TIME_UTC: "invalid" }, now),
  );
});
test("deployment UI distinguishes matching, stale, missing and local metadata", () => {
  const build = createBuildInfo(env, now);
  assert.match(compareBuilds(build, { ...build }), /^Matching deployment/);
  for (const field of ["version", "buildId", "commit", "builtAtUtc"]) {
    const other = {
      ...build,
      [field]:
        field === "commit"
          ? "b".repeat(40)
          : field === "builtAtUtc"
            ? "2026-10-18T17:00:00Z"
            : "different",
    };
    assert.match(compareBuilds(build, other), /^Different builds/);
  }
  assert.match(compareBuilds(build, null), /not verified/);
  assert.match(
    compareBuilds(build, { ...build, buildId: "local.123" }),
    /not verified/,
  );
  assert.equal(formatBuildTime(null), "time unavailable");
  assert.match(formatBuildTime(now.toISOString()), /18:00:00.*Europe\/London/);
});
