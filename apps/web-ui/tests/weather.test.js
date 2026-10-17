import test from "node:test";
import assert from "node:assert/strict";
import { WeatherService } from "../src/plugins/weather/WeatherService.js";

function fixture(request) {
  const events = new Map();
  let cancelled = 0;
  const client = {
    on(type, fn) {
      events.set(type, fn);
      return () => events.delete(type);
    },
    getSnapshot: () => ({ status: "online" }),
    request,
  };
  const service = new WeatherService(client, {
    now: () => 1000,
    schedule: () => 1,
    cancel: () => cancelled++,
  });
  return { service, events, cancelled: () => cancelled };
}
test("weather lifecycle fetches data and removes subscriptions and polling on stop", async () => {
  const { service, events, cancelled } = fixture(async (type) => ({
    data: type.includes("Forecast")
      ? []
      : { weather: { temp: 14 }, secondsUntilRefresh: 60 },
  }));
  service.start();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(service.getSnapshot().weather.temp, 14);
  assert.equal(service.getSnapshot().refreshAt, 61000);
  service.stop();
  assert.equal(events.size, 0);
  assert.equal(cancelled(), 1);
});
test("weather ignores stale replies after its package is stopped", async () => {
  const replies = [];
  const { service } = fixture(
    () => new Promise((resolve) => replies.push(resolve)),
  );
  service.start();
  service.stop();
  replies.forEach((resolve) => resolve({ data: { weather: { temp: 99 } } }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(service.getSnapshot().weather, null);
});
test("weather exposes failures and schedules a bounded retry", async () => {
  const { service } = fixture(async () => {
    throw new Error("Server unavailable");
  });
  service.start();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(service.getSnapshot().weatherError, "Server unavailable");
  assert.equal(service.getSnapshot().refreshAt, 31000);
  service.stop();
});
test("default weather timers preserve the browser timer receiver", () => {
  const originalSchedule = globalThis.setTimeout,
    originalCancel = globalThis.clearTimeout;
  let cancelled = false;
  try {
    globalThis.setTimeout = function () {
      assert.equal(this, globalThis);
      return 123;
    };
    globalThis.clearTimeout = function (id) {
      assert.equal(this, globalThis);
      assert.equal(id, 123);
      cancelled = true;
    };
    const client = {
      on: () => () => {},
      getSnapshot: () => ({ status: "offline" }),
    };
    const service = new WeatherService(client);
    service.start();
    service.stop();
    assert.equal(cancelled, true);
  } finally {
    globalThis.setTimeout = originalSchedule;
    globalThis.clearTimeout = originalCancel;
  }
});
