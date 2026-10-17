import { registry } from "../core/AppRegistry";
import { PluginManager } from "../core/PluginManager";
import { StorageRepository } from "../core/StorageRepository";
import { runtime, server } from "./services";

// Adding a package requires no shell route/launcher/widget edits.
const manifests = import.meta.glob("../plugins/*/manifest.json", {
  eager: true,
  import: "default",
});
const modules = import.meta.glob("../plugins/*/plugin.jsx", { eager: true });
for (const manifest of Object.values(manifests)) registry.register(manifest);
let storage;
try {
  storage = window.localStorage;
} catch {
  /* Manager reports unavailable persistence when installing. */
}
export const plugins = new PluginManager(
  registry,
  new StorageRepository(storage, "homesystem.plugins.v1"),
  { runtime, server },
);
for (const [path, module] of Object.entries(modules)) {
  const id = path.split("/").at(-2);
  if (registry.get(id)) plugins.registerPackage(id, module.default);
}
