import { ObservableStore } from "./ObservableStore.js";

export class PluginManager extends ObservableStore {
  constructor(registry, repository, context = {}) {
    const saved = repository.load();
    const installed = registry
      .all()
      .filter(
        (app) =>
          app.required ||
          (typeof saved?.installed?.[app.id] === "boolean"
            ? saved.installed[app.id]
            : app.defaultInstalled),
      )
      .map((app) => app.id);
    super({ installed, error: null });
    this.registry = registry;
    this.repository = repository;
    this.context = context;
    this.packages = new Map();
  }
  registerPackage(id, plugin) {
    this.packages.set(id, plugin);
  }
  isInstalled(id) {
    return this.state.installed.includes(id);
  }
  installedApps() {
    return this.registry.all().filter((app) => this.isInstalled(app.id));
  }
  persist(installed) {
    const flags = Object.fromEntries(
      this.registry.all().map((app) => [app.id, installed.includes(app.id)]),
    );
    if (!this.repository.save({ installed: flags }))
      throw new Error(
        "Installation could not be saved. Check browser storage.",
      );
    this.update({ installed, error: null });
  }
  install(id) {
    const app = this.registry.get(id);
    if (!app || !this.packages.has(id))
      throw new Error("This app package is not available.");
    if (this.isInstalled(id)) return;
    const missing = app.dependencies.filter(
      (dependency) => !this.isInstalled(dependency),
    );
    if (missing.length)
      throw new Error(`Install required apps first: ${missing.join(", ")}`);
    this.packages.get(id).onInstall?.(this.context);
    this.persist([...this.state.installed, id]);
    const runtime = this.context.runtime;
    const layout = runtime?.getSnapshot().appData.launcher?.layout;
    if (app.launcher && Array.isArray(layout)) {
      const present = layout.some(
        (item) =>
          item &&
          (item.id === id ||
            (Array.isArray(item.children) && item.children.includes(id))),
      );
      if (!present)
        runtime.setAppState("launcher", {
          layout: [...layout, { id, type: "app" }],
        });
    }
  }
  uninstall(id) {
    const app = this.registry.get(id);
    if (!app || !this.isInstalled(id)) return;
    if (app.required)
      throw new Error(
        `${app.name} is part of the home system and cannot be uninstalled.`,
      );
    const dependents = this.installedApps().filter((candidate) =>
      candidate.dependencies.includes(id),
    );
    if (dependents.length)
      throw new Error(
        `Uninstall dependent apps first: ${dependents.map((item) => item.name).join(", ")}`,
      );
    // Save the new installation state before stopping/removing local data.
    this.persist(
      this.state.installed.filter((installedId) => installedId !== id),
    );
    try {
      this.packages.get(id)?.onUninstall?.(this.context);
    } finally {
      this.context.runtime?.removeApp(id);
    }
  }
}
