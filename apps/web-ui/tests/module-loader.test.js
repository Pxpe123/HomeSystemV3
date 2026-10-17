import test from "node:test";
import assert from "node:assert/strict";
import { createModuleLoader } from "../src/core/ModuleLoader.js";

test("background preload and route render share one cached module request", async () => {
  let calls = 0;
  const module = { default: () => null };
  const load = createModuleLoader(async () => {
    calls++;
    return module;
  });
  const warm = load();
  assert.equal(load(), warm);
  assert.equal(await warm, module);
  assert.equal(await load(), module);
  assert.equal(calls, 1);
});

test("a failed warm-up can retry without an unhandled cached rejection", async () => {
  let calls = 0;
  const load = createModuleLoader(async () => {
    if (++calls === 1) throw new Error("Offline");
    return { default: "ready" };
  });
  await assert.rejects(load(), /Offline/);
  assert.equal((await load()).default, "ready");
  assert.equal(calls, 2);
});
