import test from "node:test";
import assert from "node:assert/strict";
import { solarTimes } from "../src/core/SolarTimes.js";

test("Liverpool sun times use the selected date and match the October reference to within two minutes", () => {
  const result = solarTimes(new Date("2026-10-17T12:00:00Z"));
  assert.equal(result.date, "2026-10-17");
  assert.equal(result.timeZone, "Europe/London");
  assert.ok(Math.abs(result.sunrise * 60 - (7 * 60 + 42)) <= 2);
  assert.ok(Math.abs(result.sunset * 60 - (18 * 60 + 11)) <= 2);
});
test("sun times apply UK daylight saving instead of the host timezone", () => {
  const before = solarTimes(new Date("2026-10-24T12:00:00Z"));
  const after = solarTimes(new Date("2026-10-25T12:00:00Z"));
  assert.ok(before.sunrise - after.sunrise > 0.9);
  assert.equal(solarTimes(new Date("2026-10-17T23:30:00Z")).date, "2026-10-18");
});
