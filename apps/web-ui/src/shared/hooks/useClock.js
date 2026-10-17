import { useSyncExternalStore } from "react";
import { ClockStore } from "../../core/ClockStore";
const clock = new ClockStore();
export function useClock() {
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot);
}
export function duration(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
