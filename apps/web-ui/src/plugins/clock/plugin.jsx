import { useEffect } from "react";
import { lazyApp } from "../../application/lazyApp";
/* eslint-disable react-refresh/only-export-components -- Package descriptor includes lifecycle components. */
import { faClock } from "@fortawesome/free-solid-svg-icons";
const TimerApp = lazyApp(() =>
  import("./TimerApp").then((module) => ({ default: module.TimerApp })),
);
import ClockWidget from "./ui/ClockWidget";
import { TimerWidget, StopwatchWidget } from "./ActiveWidgets";
import { useHome } from "../../application/useHome";
import { runtime } from "../../application/services";
function DashboardWidget() {
  const sunTimes = useHome((state) => state.globals.sunTimes);
  return <ClockWidget sunTimes={sunTimes} />;
}
function Controller() {
  useEffect(() => {
    const resume = () => runtime.tick();
    resume();
    const interval = setInterval(resume, 500);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return null;
}
export default {
  Page: TimerApp,
  DashboardWidget,
  Controller,
  icon: faClock,
  getActiveWidgets(snapshot, { now }) {
    const widgets = snapshot.timers.map((timer) => ({
      id: timer.id,
      name: timer.label,
      Component: TimerWidget,
      props: { timer, now },
    }));
    if (snapshot.stopwatch.startedAt !== null || snapshot.stopwatch.elapsed > 0)
      widgets.push({
        id: "stopwatch",
        name: "Stopwatch",
        Component: StopwatchWidget,
        props: { stopwatch: snapshot.stopwatch },
      });
    return widgets;
  },
  onUninstall({ runtime }) {
    for (const timer of runtime.getSnapshot().timers)
      runtime.removeTimer(timer.id);
    runtime.resetStopwatch();
  },
};
