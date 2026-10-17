/** Compatibility facade. Mutable global state is owned by HomeRuntime. */
import { runtime, server } from "./application/services";

export const env = Object.freeze({
  WS_URL: server.url,
  DEBUG: import.meta.env.VITE_DEBUG === "true",
});
export function getGlobal(key) {
  return runtime.getSnapshot().globals[key];
}
export function setGlobal(key, value) {
  runtime.setGlobal(key, value);
}
export default {
  env,
  get location() {
    return getGlobal("location") || { city: "Loading...", lat: 0, lon: 0 };
  },
  getGlobal,
  setGlobal,
};
