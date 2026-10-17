/** Immutable snapshots let React subscribe without coupling domain classes to React. */
export class ObservableStore {
  listeners = new Set();
  constructor(initial) {
    this.state = Object.freeze(initial);
  }
  getSnapshot = () => this.state;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  update(patch) {
    if (
      Object.keys(patch).every((key) => Object.is(this.state[key], patch[key]))
    )
      return false;
    this.state = Object.freeze({ ...this.state, ...patch });
    this.listeners.forEach((listener) => listener());
    return true;
  }
}
