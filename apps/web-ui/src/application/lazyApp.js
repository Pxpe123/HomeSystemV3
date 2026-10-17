import { lazy } from "react";
import { createModuleLoader } from "../core/ModuleLoader";

/** Lazy route plus a host-owned warm-up entry point; never mounts app side effects. */
export function lazyApp(importModule) {
  const load = createModuleLoader(importModule);
  return Object.assign(lazy(load), { preload: load });
}
