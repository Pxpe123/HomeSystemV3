/** The persisted state boundary. Bad or obsolete browser data cannot break views. */
export class RuntimeState {
  static restore(saved) {
    const record = (value) =>
      value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const source = record(saved);
    const watch = record(source.stopwatch);
    return {
      sessions: {
        ...record(source.sessions),
        spotify: { ...record(source.sessions)?.spotify, status: "idle" },
      },
      appData: record(source.appData),
      globals: record(source.globals),
      timers: (Array.isArray(source.timers) ? source.timers : []).filter(
        (timer) =>
          timer &&
          typeof timer.id === "string" &&
          typeof timer.label === "string" &&
          ["running", "paused", "complete"].includes(timer.status) &&
          Number.isFinite(timer.remaining) &&
          Number.isFinite(timer.duration) &&
          (timer.status !== "running" || Number.isFinite(timer.endsAt)),
      ),
      notifications: (Array.isArray(source.notifications)
        ? source.notifications
        : []
      )
        .filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            Number.isFinite(item.createdAt),
        )
        .slice(0, 100),
      stopwatch: {
        startedAt: Number.isFinite(watch.startedAt) ? watch.startedAt : null,
        elapsed:
          Number.isFinite(watch.elapsed) && watch.elapsed > 0
            ? watch.elapsed
            : 0,
      },
      preferences: {
        name: "Home",
        reducedEffects: false,
        doNotDisturb: false,
        soundEnabled: false,
        vibrationEnabled: false,
        ...record(source.preferences),
      },
      toast: null,
    };
  }
}
