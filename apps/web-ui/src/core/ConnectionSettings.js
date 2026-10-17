/** Per-display connection details only. Never stores credentials or profile PINs. */
export class ConnectionSettings {
  constructor(storage, fallback) {
    this.storage = storage;
    this.fallback = fallback;
    this.key = 'homesystem.connection.v1';
  }
  normalize(value) {
    const url = new URL(value.trim());
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      throw new Error('Use a server address without credentials, query parameters or fragments.');
    url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:';
    if (url.pathname === '/') url.pathname = '/ws';
    if (new URL(this.fallback).protocol === 'wss:' && url.protocol !== 'wss:')
      throw new Error('This secure display needs an HTTPS or WSS server address.');
    return url.href;
  }
  load() {
    try {
      const value = JSON.parse(this.storage?.getItem(this.key) || 'null');
      return value?.version === 1 ? { endpoint: this.normalize(value.endpoint) } : null;
    } catch { return null; }
  }
  save(endpoint) {
    const value = { version: 1, endpoint: this.normalize(endpoint) };
    try {
      if (!this.storage) return false;
      this.storage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch { return false; }
  }
}
