import test from "node:test";
import assert from "node:assert/strict";
import { SwipeGesture } from "../src/core/SwipeGesture.js";

test("app exit requires a deliberate rightward swipe, not a tap or vertical scroll", () => {
  const gesture = new SwipeGesture();
  gesture.begin(10, 200);
  assert.equal(gesture.end(50, 200), 0);
  gesture.begin(10, 200);
  assert.equal(gesture.end(240, 200), -1);
  gesture.begin(10, 200);
  assert.equal(gesture.end(150, 500), 0);
  gesture.begin(10, 200);
  gesture.cancel();
  assert.equal(gesture.end(240, 200), 0);
});
