import { ServerClient } from "../core/ServerClient";
import { HomeRuntime } from "../core/HomeRuntime";
import { StorageRepository } from "../core/StorageRepository";
import { ConnectionSettings } from "../core/ConnectionSettings";

let storage;
try {
  storage = window.localStorage;
} catch {
  /* Restricted browser: retain in-memory state. */
}
export const repository = new StorageRepository(storage);
export const connectionSettings = new ConnectionSettings(storage,
  import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`);
export const server = new ServerClient(connectionSettings.load()?.endpoint || connectionSettings.fallback);
export const runtime = new HomeRuntime(repository);
