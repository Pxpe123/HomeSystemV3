import test from "node:test";
import assert from "node:assert/strict";
import { HomeRuntime } from "../src/core/HomeRuntime.js";
import { StorageRepository } from "../src/core/StorageRepository.js";

test("testing reset clears saved user state and cannot restore deleted notifications through Undo", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const repository = new StorageRepository(storage);
  const runtime = new HomeRuntime(repository);
  runtime.notify({ title: "Test message" });
  runtime.clearNotifications();
  runtime.setAppState("spotify", { profileLinks: { old: "old-account" } });
  assert.equal(runtime.resetUserData(), true);
  assert.equal(repository.load(), null);
  assert.deepEqual(runtime.getSnapshot().appData, {});
  assert.deepEqual(runtime.getSnapshot().timers, []);
  runtime.undoNotifications();
  assert.equal(runtime.getSnapshot().notifications.length, 0);
});

test("testing reset reports browser storage failures honestly", () => {
  const repository = new StorageRepository({
    getItem: () => null,
    removeItem: () => {
      throw Error("blocked");
    },
  });
  assert.equal(new HomeRuntime(repository).resetUserData(), false);
});
