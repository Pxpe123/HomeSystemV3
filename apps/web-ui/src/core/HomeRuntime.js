import { ObservableStore } from "./ObservableStore.js";
import { registry } from "./AppRegistry.js";
import { RuntimeState } from "./RuntimeState.js";

/** Owns app sessions, timers, notification history and display preferences. */
export class HomeRuntime extends ObservableStore {
  constructor(repository, clock = () => Date.now()) {
    const saved = repository.load();
    super(RuntimeState.restore(saved));
    this.repository = repository;
    this.clock = clock;
  }
  commit(patch) {
    if (!this.update(patch)) return;
    if (
      !this.repository.save({ ...this.state, toast: undefined }) &&
      !this.storageWarning
    ) {
      this.storageWarning = true;
      this.update({
        toast: {
          id: this.id(),
          title: "Display storage unavailable",
          message: "Changes will last until this page closes.",
          tone: "warning",
        },
      });
    }
  }
  id() {
    return `${this.clock()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  open(id) {
    if (!registry.get(id)) return;
    const previous = this.state.sessions[id] || {};
    this.commit({
      sessions: {
        ...this.state.sessions,
        [id]: {
          ...previous,
          status: previous.status || "idle",
          openedAt: this.clock(),
        },
      },
    });
  }
  setSession(id, patch) {
    this.commit({
      sessions: {
        ...this.state.sessions,
        [id]: { ...this.state.sessions[id], ...patch },
      },
    });
  }
  notify({ title, message = "", appId = null, tone = "info", dedupeKey }) {
    if (
      dedupeKey &&
      this.state.notifications.some((item) => item.dedupeKey === dedupeKey)
    )
      return;
    const item = {
      id: this.id(),
      title,
      message,
      appId,
      tone,
      type: tone,
      dedupeKey,
      read: false,
      createdAt: this.clock(),
    };
    this.commit({
      notifications: [item, ...this.state.notifications].slice(0, 100),
      toast: this.state.preferences.doNotDisturb ? null : item,
    });
  }
  read(id) {
    this.commit({
      notifications: this.state.notifications.map((item) =>
        item.id === id || id === "all" ? { ...item, read: true } : item,
      ),
    });
  }
  removeNotification(id) {
    this.notificationUndo = this.state.notifications.filter(
      (item) => item.id === id,
    );
    this.commit({
      notifications: this.state.notifications.filter((item) => item.id !== id),
      toast: {
        id: this.id(),
        title: "Notification dismissed",
        message: "",
        action: "undo",
      },
    });
  }
  clearRead() {
    this.commit({
      notifications: this.state.notifications.filter((item) => !item.read),
    });
  }
  clearNotifications() {
    this.notificationUndo = this.state.notifications;
    this.commit({
      notifications: [],
      toast: {
        id: this.id(),
        title: "Notifications cleared",
        message: "",
        action: "undo",
      },
    });
  }
  undoNotifications() {
    if (!this.notificationUndo?.length) return;
    const existing = new Set(this.state.notifications.map((item) => item.id));
    const restored = this.notificationUndo.filter(
      (item) => !existing.has(item.id),
    );
    this.notificationUndo = null;
    this.commit({
      notifications: [...this.state.notifications, ...restored]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 100),
      toast: null,
    });
  }
  dismissToast() {
    this.update({ toast: null });
  }
  setPreferences(patch) {
    if (
      Object.keys(patch).every((key) =>
        Object.is(this.state.preferences[key], patch[key]),
      )
    )
      return;
    this.commit({ preferences: { ...this.state.preferences, ...patch } });
  }
  /** Serializable, non-sensitive app preferences. Never pass tokens or credentials. */
  setAppState(id, patch) {
    if (
      Object.keys(patch).every((key) =>
        Object.is(this.state.appData[id]?.[key], patch[key]),
      )
    )
      return;
    this.commit({
      appData: {
        ...this.state.appData,
        [id]: { ...this.state.appData[id], ...patch },
      },
    });
  }
  removeApp(id) {
    const sessions = { ...this.state.sessions },
      appData = { ...this.state.appData };
    delete sessions[id];
    delete appData[id];
    if (Array.isArray(appData.launcher?.layout)) {
      appData.launcher = {
        ...appData.launcher,
        layout: appData.launcher.layout
          .filter((item) => item && item.id !== id)
          .map((item) =>
            item.type === "folder"
              ? {
                  ...item,
                  children: (Array.isArray(item.children)
                    ? item.children
                    : []
                  ).filter((child) => child !== id),
                }
              : item,
          ),
      };
    }
    this.commit({ sessions, appData });
  }
  setGlobal(key, value) {
    if (Object.is(this.state.globals[key], value)) return;
    this.commit({ globals: { ...this.state.globals, [key]: value } });
  }
  toggleStopwatch() {
    const watch = this.state.stopwatch;
    this.commit({
      stopwatch:
        watch.startedAt === null
          ? { ...watch, startedAt: this.clock() }
          : {
              startedAt: null,
              elapsed: watch.elapsed + this.clock() - watch.startedAt,
            },
    });
  }
  resetStopwatch() {
    this.commit({ stopwatch: { startedAt: null, elapsed: 0 } });
  }
  stopwatchElapsed() {
    const watch = this.state.stopwatch;
    return (
      watch.elapsed +
      (watch.startedAt === null ? 0 : this.clock() - watch.startedAt)
    );
  }
  startTimer(label, seconds) {
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400)
      throw new Error("Choose a duration between 1 second and 24 hours.");
    const timer = {
      id: this.id(),
      label: label.trim() || "Timer",
      duration: seconds * 1000,
      remaining: seconds * 1000,
      endsAt: this.clock() + seconds * 1000,
      status: "running",
    };
    this.commit({ timers: [...this.state.timers, timer] });
    this.setSession("clock", { status: "running", summary: timer.label });
    return timer;
  }
  toggleTimer(id) {
    this.tick();
    this.commit({
      timers: this.state.timers.map((timer) =>
        timer.id !== id || timer.status === "complete"
          ? timer
          : timer.status === "running"
            ? {
                ...timer,
                remaining: Math.max(0, timer.endsAt - this.clock()),
                endsAt: null,
                status: "paused",
              }
            : {
                ...timer,
                endsAt: this.clock() + timer.remaining,
                status: "running",
              },
      ),
    });
  }
  removeTimer(id) {
    const timers = this.state.timers.filter((timer) => timer.id !== id);
    this.commit({ timers });
    if (!timers.length)
      this.setSession("clock", { status: "idle", summary: "" });
  }
  tick() {
    const completed = this.state.timers.filter(
      (timer) => timer.status === "running" && timer.endsAt <= this.clock(),
    );
    if (!completed.length) return;
    this.commit({
      timers: this.state.timers.map((timer) =>
        completed.includes(timer)
          ? { ...timer, status: "complete", remaining: 0, endsAt: null }
          : timer,
      ),
    });
    completed.forEach((timer) =>
      this.notify({
        title: `${timer.label} is ready`,
        message: "Your timer has finished.",
        appId: "clock",
        tone: "success",
        dedupeKey: `timer:${timer.id}`,
      }),
    );
    this.setSession("clock", {
      status: this.state.timers.some((timer) => timer.status === "running")
        ? "running"
        : "idle",
    });
  }
}
