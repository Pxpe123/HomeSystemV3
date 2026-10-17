/** App identity is provided by package manifests, never by a shell-owned list. */
export class AppDefinition {
  constructor(manifest) {
    if (!manifest || typeof manifest !== "object")
      throw new Error("Invalid plugin manifest");
    if (!/^[a-z][a-z0-9-]*$/.test(manifest.id || ""))
      throw new Error("Invalid plugin ID");
    if (!manifest.name || !/^\d+\.\d+\.\d+$/.test(manifest.version || ""))
      throw new Error(`Invalid manifest for ${manifest.id}`);
    if (manifest.apiVersion !== 1)
      throw new Error(`Unsupported plugin API: ${manifest.id}`);
    if (
      manifest.dependencies !== undefined &&
      (!Array.isArray(manifest.dependencies) ||
        manifest.dependencies.some(
          (id) =>
            typeof id !== "string" ||
            id === manifest.id ||
            !/^[a-z][a-z0-9-]*$/.test(id),
        ))
    )
      throw new Error(`Invalid dependencies: ${manifest.id}`);
    Object.assign(this, {
      description: "",
      icon: "apps",
      color: "#4A9EFF",
      category: "Home",
      defaultInstalled: true,
      required: false,
      dependencies: [],
      ...manifest,
    });
    this.dependencies = Object.freeze([...this.dependencies]);
    this.extraRoutes = Object.freeze([...(this.extraRoutes || [])]);
    Object.freeze(this);
  }
  get path() {
    return `/app/${this.id}`;
  }
}
export class AppRegistry {
  apps = [];
  constructor(definitions = []) {
    definitions.forEach((definition) => this.register(definition));
  }
  register(manifest) {
    const definition = new AppDefinition(manifest);
    if (this.get(definition.id))
      throw new Error(`Duplicate plugin: ${definition.id}`);
    this.apps = Object.freeze([...this.apps, definition]);
    return definition;
  }
  get(id) {
    return this.apps.find((app) => app.id === id);
  }
  all() {
    return this.apps;
  }
}
export const registry = new AppRegistry();
