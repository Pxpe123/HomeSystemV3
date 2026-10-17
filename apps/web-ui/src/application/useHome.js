import { useCallback, useSyncExternalStore } from "react";
import { runtime, server } from "./services";

const identity = (state) => state;
/** Select a stable state branch or primitive to avoid unrelated rerenders. */
export function useHome(selector = identity) {
  const snapshot = useCallback(
    () => selector(runtime.getSnapshot()),
    [selector],
  );
  return useSyncExternalStore(runtime.subscribe, snapshot);
}
export function useConnection() {
  return useSyncExternalStore(server.subscribe, server.getSnapshot);
}
