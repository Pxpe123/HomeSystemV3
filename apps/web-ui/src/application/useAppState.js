import { useCallback } from "react";
import { useHome } from "./useHome";
import { runtime } from "./services";

/** Persistent equivalent of useState for non-sensitive per-app UI preferences. */
export function useAppState(appId, key, initialValue) {
  const value = useHome((state) => state.appData[appId]?.[key] ?? initialValue);
  const setValue = useCallback(
    (next) => {
      const previous =
        runtime.getSnapshot().appData[appId]?.[key] ?? initialValue;
      runtime.setAppState(appId, {
        [key]: typeof next === "function" ? next(previous) : next,
      });
    },
    [appId, key, initialValue],
  );
  return [value, setValue];
}
