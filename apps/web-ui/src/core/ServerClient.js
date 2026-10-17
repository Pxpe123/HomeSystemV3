import { ObservableStore } from "./ObservableStore.js";

/** One reconnecting transport for all apps. Pending commands are never replayed. */
export class ServerClient extends ObservableStore {
  pending = new Map();
  events = new Map();
  stopped = true;
  constructor(url, Socket = globalThis.WebSocket) {
    super({ status: "offline", error: null, connectedAt: null });
    this.url = url;
    this.Socket = Socket;
  }
  on(type, callback) {
    if (!this.events.has(type)) this.events.set(type, new Set());
    this.events.get(type).add(callback);
    return () => this.events.get(type)?.delete(callback);
  }
  emit(type, value) {
    this.events.get(type)?.forEach((callback) => callback(value));
  }
  configureEndpoint(url) {
    this.stop();
    this.url = url;
    this.connect();
  }
  connect = () => {
    if (this.socket && this.socket.readyState < 2) return;
    clearTimeout(this.reconnect);
    this.stopped = false;
    this.update({ status: "connecting", error: null });
    const socket = new this.Socket(this.url);
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.update({ status: "online", error: null, connectedAt: Date.now() });
      this.emit("connected");
    };
    socket.onmessage = (event) => {
      if (this.socket === socket) this.receive(event.data);
    };
    socket.onerror = () => {
      if (this.socket === socket)
        this.update({ error: "The home server could not be reached." });
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.rejectPending(
        "Connection lost. Check the app state before trying again.",
      );
      this.update({ status: "offline" });
      if (!this.stopped) this.reconnect = setTimeout(this.connect, 3000);
    };
  };
  receive(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (!message || typeof message !== "object" || Array.isArray(message))
      return;
    const type = message.Type ?? message.type;
    if (type === "ack") return;
    const requestId = message.RequestId ?? message.requestId;
    const normalized = {
      ...message,
      type,
      data: message.Data ?? message.data,
      error: message.Error ?? message.error,
      success: message.Success ?? message.success,
    };
    if (requestId && this.pending.has(requestId)) {
      const pending = this.pending.get(requestId);
      clearTimeout(pending.timeout);
      this.pending.delete(requestId);
      if (normalized.error || normalized.success === false)
        pending.reject(
          new Error(normalized.error || "The request could not be completed."),
        );
      else pending.resolve(normalized);
    }
    this.emit(type, normalized);
  }
  request = (type, data = {}) =>
    new Promise((resolve, reject) => {
      if (this.state.status !== "online")
        return reject(
          new Error("The home server is offline. Reconnect to continue."),
        );
      const requestId =
        globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(
          new Error(
            "The server did not respond. Check the current state before retrying.",
          ),
        );
      }, 10000);
      this.pending.set(requestId, { resolve, reject, timeout });
      try {
        this.socket.send(
          JSON.stringify({ Type: type, RequestId: requestId, Data: data }),
        );
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(requestId);
        reject(error);
      }
    });
  rejectPending(message) {
    this.pending.forEach((item) => {
      clearTimeout(item.timeout);
      item.reject(new Error(message));
    });
    this.pending.clear();
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.reconnect);
    this.rejectPending("Connection closed.");
    this.socket?.close();
    this.socket = null;
    this.update({ status: "offline" });
  }
}
