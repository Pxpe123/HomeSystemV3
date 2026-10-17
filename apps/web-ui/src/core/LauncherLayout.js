/** Immutable launcher operations. Layout contains IDs only; manifests own presentation. */
export class LauncherLayout {
  constructor(items, appIds) {
    this.appIds = new Set(appIds);
    const seen = new Set();
    const folders = new Set();
    const take = (id) =>
      typeof id === "string" &&
      this.appIds.has(id) &&
      !seen.has(id) &&
      (seen.add(id), true);
    this.items = (Array.isArray(items) ? items : []).flatMap((item) => {
      if (!item || typeof item.id !== "string") return [];
      if (item.type === "app")
        return take(item.id) ? [{ id: item.id, type: "app" }] : [];
      if (
        item.type !== "folder" ||
        this.appIds.has(item.id) ||
        folders.has(item.id)
      )
        return [];
      folders.add(item.id);
      return [
        {
          id: item.id,
          type: "folder",
          name: String(item.name || "Folder").slice(0, 40),
          children: (Array.isArray(item.children) ? item.children : []).filter(
            take,
          ),
        },
      ];
    });
  }
  next(items) {
    return new LauncherLayout(items, this.appIds);
  }
  placed() {
    return new Set(
      this.items.flatMap((item) =>
        item.type === "folder" ? item.children : [item.id],
      ),
    );
  }
  add(id) {
    return this.appIds.has(id) && !this.placed().has(id)
      ? this.next([...this.items, { id, type: "app" }])
      : this;
  }
  remove(id) {
    return this.next(this.items.filter((item) => item.id !== id));
  }
  move(id, delta) {
    const index = this.items.findIndex((item) => item.id === id),
      target = index + delta;
    if (index < 0 || target < 0 || target >= this.items.length) return this;
    const items = [...this.items];
    [items[index], items[target]] = [items[target], items[index]];
    return this.next(items);
  }
  createFolder(id, name = "New folder") {
    return this.next([
      ...this.items,
      { id, type: "folder", name, children: [] },
    ]);
  }
  rename(id, name) {
    return this.next(
      this.items.map((item) =>
        item.id === id && item.type === "folder"
          ? { ...item, name: name.trim() || "Folder" }
          : item,
      ),
    );
  }
  putInFolder(id, folderId) {
    if (
      !this.appIds.has(id) ||
      !this.items.some((item) => item.id === folderId && item.type === "folder")
    )
      return this;
    const items = this.items
      .filter((item) => item.id !== id)
      .map((item) =>
        item.type !== "folder"
          ? item
          : {
              ...item,
              children:
                item.id === folderId
                  ? [...item.children.filter((child) => child !== id), id]
                  : item.children.filter((child) => child !== id),
            },
      );
    return this.next(items);
  }
  takeOut(id, folderId) {
    if (
      !this.items.some(
        (item) => item.id === folderId && item.children?.includes(id),
      )
    )
      return this;
    return this.next([
      ...this.items.map((item) =>
        item.id === folderId
          ? { ...item, children: item.children.filter((child) => child !== id) }
          : item,
      ),
      { id, type: "app" },
    ]);
  }
}
