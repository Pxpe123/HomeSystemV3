import test from "node:test";
import assert from "node:assert/strict";
import { AppRegistry } from "../src/core/AppRegistry.js";
import { PluginManager } from "../src/core/PluginManager.js";
import { StorageRepository } from "../src/core/StorageRepository.js";

const definition = (id, extra = {}) => ({
  id,
  name: id,
  version: "1.0.0",
  apiVersion: 1,
  defaultInstalled: false,
  ...extra,
});
function setup() {
  const registry = new AppRegistry([
    definition("base"),
    definition("dependent", { dependencies: ["base"] }),
    definition("settings", { required: true }),
  ]);
  const data = new Map();
  const repository = new StorageRepository({
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  });
  const removed = [];
  const manager = new PluginManager(registry, repository, {
    runtime: {
      removeApp: (id) => removed.push(id),
      getSnapshot: () => ({ appData: {} }),
    },
  });
  registry.all().forEach((app) => manager.registerPackage(app.id, {}));
  return { registry, repository, manager, removed };
}
test("manifest validation rejects duplicate identities and unsupported APIs", () => {
  const registry = new AppRegistry([definition("base")]);
  assert.throws(() => registry.register(definition("base")), /Duplicate/);
  assert.throws(
    () => registry.register(definition("invalid", { apiVersion: 2 })),
    /Unsupported/,
  );
});
test("install and uninstall persist across reloads and run cleanup", () => {
  const { manager, registry, repository, removed } = setup();
  let stopped = false;
  manager.registerPackage("base", {
    onUninstall: () => {
      stopped = true;
    },
  });
  manager.install("base");
  assert.equal(
    new PluginManager(registry, repository).isInstalled("base"),
    true,
  );
  manager.uninstall("base");
  assert.equal(stopped, true);
  assert.deepEqual(removed, ["base"]);
  assert.equal(
    new PluginManager(registry, repository).isInstalled("base"),
    false,
  );
});
test("required apps, missing packages and dependency order are protected", () => {
  const { manager } = setup();
  assert.throws(() => manager.uninstall("settings"), /cannot/);
  assert.throws(() => manager.install("unknown"), /not available/);
  assert.throws(() => manager.install("dependent"), /required apps/);
  manager.install("base");
  manager.install("dependent");
  assert.throws(() => manager.uninstall("base"), /dependent apps/);
  manager.uninstall("dependent");
  manager.uninstall("base");
});
test("failed persistence leaves the installation unchanged", () => {
  const { manager } = setup();
  manager.repository.save = () => false;
  assert.throws(() => manager.install("base"), /could not be saved/);
  assert.equal(manager.isInstalled("base"), false);
});
