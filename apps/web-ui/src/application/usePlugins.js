import { useMemo, useSyncExternalStore } from "react";
import { plugins } from "./plugins";
export function usePlugins() {
  const state = useSyncExternalStore(plugins.subscribe, plugins.getSnapshot);
  const apps = useMemo(
    () =>
      plugins.registry.all().filter((app) => state.installed.includes(app.id)),
    [state.installed],
  );
  return { ...state, manager: plugins, apps };
}
