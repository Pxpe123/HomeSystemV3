import test from "node:test";
import assert from "node:assert/strict";
import { ClockStore } from "../src/core/ClockStore.js";
import { ObservableStore } from "../src/core/ObservableStore.js";
import { LauncherLayout } from "../src/core/LauncherLayout.js";
import { SwipeGesture } from "../src/core/SwipeGesture.js";
import { sunTime } from "../src/shared/format.js";
import { timerRemaining } from "../src/plugins/clock/timer.js";

test("a shared clock starts once and stops after its final subscriber", () => {
  let starts = 0,
    stops = 0,
    tick,
    now = 10;
  const clock = new ClockStore({
    now: () => now,
    schedule: (callback) => {
      starts++;
      tick = callback;
      return 1;
    },
    cancel: () => stops++,
  });
  let updates = 0;
  const a = clock.subscribe(() => updates++),
    b = clock.subscribe(() => updates++);
  assert.equal(starts, 1);
  now = 20;
  tick();
  assert.equal(clock.getSnapshot(), 20);
  assert.equal(updates, 2);
  a();
  assert.equal(stops, 0);
  b();
  assert.equal(stops, 1);
});
test("stores do not notify for an unchanged patch", () => {
  const store = new ObservableStore({ value: 1 });
  let calls = 0;
  store.subscribe(() => calls++);
  store.update({ value: 1 });
  assert.equal(calls, 0);
  store.update({ value: 2 });
  assert.equal(calls, 1);
});
test("launcher normalises broken storage and duplicate or uninstalled apps", () => {
  const model = new LauncherLayout(
    [
      { id: "a", type: "app" },
      { id: "f", type: "folder", children: ["a", "b", "gone", "b"] },
      null,
      { id: "gone", type: "app" },
    ],
    ["a", "b"],
  );
  assert.deepEqual(model.items, [
    { id: "a", type: "app" },
    { id: "f", type: "folder", name: "Folder", children: ["b"] },
  ]);
});
test("launcher operations are immutable and preserve one placement per app", () => {
  const first = new LauncherLayout(
    [
      { id: "a", type: "app" },
      { id: "b", type: "app" },
    ],
    ["a", "b"],
  );
  const grouped = first.createFolder("folder").putInFolder("a", "folder");
  assert.equal(first.items.length, 2);
  assert.deepEqual(grouped.items.at(-1).children, ["a"]);
  const extracted = grouped
    .takeOut("a", "folder")
    .move("a", -1)
    .rename("folder", "Media");
  assert.equal(extracted.placed().size, 2);
  assert.equal(
    extracted.items.find((item) => item.id === "folder").name,
    "Media",
  );
  assert.equal(extracted.add("a").items.length, extracted.items.length);
});
test("horizontal swipes ignore vertical scrolls, taps and cancellations", () => {
  const gesture = new SwipeGesture();
  gesture.begin(200, 200);
  assert.equal(gesture.end(100, 210), 1);
  gesture.begin(200, 200);
  assert.equal(gesture.end(300, 210), -1);
  gesture.begin(200, 200);
  assert.equal(gesture.end(100, 500), 0);
  gesture.begin(200, 200);
  assert.equal(gesture.end(180, 200), 0);
  gesture.begin(200, 200);
  gesture.cancel();
  assert.equal(gesture.end(0, 200), 0);
});
test("sun times preserve midnight and decimal hours without pretending they are Unix timestamps", () => {
  assert.equal(sunTime(0), "00:00");
  assert.equal(sunTime(7.25), "07:15");
  assert.equal(sunTime(18.1), "18:06");
  assert.equal(sunTime(null), "—");
});
test("default clock scheduling preserves the browser timer receiver", () => {
  const originalSchedule = globalThis.setInterval,
    originalCancel = globalThis.clearInterval;
  let cancelled = false;
  try {
    globalThis.setInterval = function () {
      assert.equal(this, globalThis);
      return 123;
    };
    globalThis.clearInterval = function (id) {
      assert.equal(this, globalThis);
      assert.equal(id, 123);
      cancelled = true;
    };
    const clock = new ClockStore();
    const stop = clock.subscribe(() => {});
    stop();
    assert.equal(cancelled, true);
  } finally {
    globalThis.setInterval = originalSchedule;
    globalThis.clearInterval = originalCancel;
  }
});
test("timer readouts clamp a stale clock tick to the configured duration", () => {
  const timer = { status: "running", endsAt: 301000, duration: 300000 };
  assert.equal(timerRemaining(timer, 500), 300000);
  assert.equal(timerRemaining(timer, 302000), 0);
});
