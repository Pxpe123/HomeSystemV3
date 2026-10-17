export class StorageRepository {
  constructor(storage, key = "homesystem.frontend.v4") {
    this.storage = storage;
    this.key = key;
  }
  load() {
    try {
      const value = JSON.parse(this.storage?.getItem(this.key) || "null");
      return value?.version === 1 ? value : null;
    } catch {
      return null;
    }
  }
  save(value) {
    try {
      if (!this.storage) return false;
      this.storage.setItem(this.key, JSON.stringify({ ...value, version: 1 }));
      return true;
    } catch {
      return false;
    }
  }
}
