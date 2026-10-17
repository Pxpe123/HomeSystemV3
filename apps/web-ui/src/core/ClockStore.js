/** One reference-counted clock shared by all visible readouts. No browser globals at import time. */
export class ClockStore {
  constructor({
    now = () => Date.now(),
    schedule = (callback, delay) => globalThis.setInterval(callback, delay),
    cancel = (timer) => globalThis.clearInterval(timer),
  } = {}) {
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.value = now();
    this.listeners = new Set();
    this.timer = null;
  }
  getSnapshot = () => this.value;
  subscribe = (listener) => {
    this.listeners.add(listener);
    if (this.timer === null) {
      this.value = this.now();
      this.timer = this.schedule(() => {
        this.value = this.now();
        this.listeners.forEach((notify) => notify());
      }, 1000);
    }
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size && this.timer !== null) {
        this.cancel(this.timer);
        this.timer = null;
      }
    };
  };
}
