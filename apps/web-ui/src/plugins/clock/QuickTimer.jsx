import { useHome } from "../../application/useHome";
import { runtime } from "../../application/services";
import { Icon } from "../../shared/ui/Icon";
import { duration, useClock } from "../../shared/hooks/useClock";
import "./QuickTimer.css";
import { timerRemaining } from "./timer";

/** The home shortcut controls only its own timer; other timers are untouched. */
export function QuickTimer() {
  const timers = useHome((state) => state.timers);
  const appData = useHome((state) => state.appData);
  const now = useClock();
  const minutes = appData.clock?.quickMinutes || 5;
  const timer = timers.find((item) => item.id === appData.clock?.quickTimerId);
  const active = timer && timer.status !== "complete";
  const running = timer?.status === "running";
  const remaining = timer ? timerRemaining(timer, now) : minutes * 60000;
  function playPause() {
    if (active) {
      runtime.toggleTimer(timer.id);
      return;
    }
    if (timer) runtime.removeTimer(timer.id);
    const created = runtime.startTimer(`${minutes} minute timer`, minutes * 60);
    runtime.setAppState("clock", { quickTimerId: created.id });
  }
  function reset() {
    if (timer) runtime.removeTimer(timer.id);
    runtime.setAppState("clock", { quickTimerId: null });
  }
  return (
    <div className="hs-quick-timer" data-no-swipe>
      <div
        className="hs-quick-presets"
        role="group"
        aria-label="Quick timer duration"
      >
        {[5, 10, 15].map((value) => (
          <button
            key={value}
            aria-label={`${value} minute preset`}
            aria-pressed={minutes === value}
            disabled={!!active}
            onClick={() =>
              runtime.setAppState("clock", { quickMinutes: value })
            }
          >
            {value}
            <span>M</span>
          </button>
        ))}
      </div>
      <output className="hs-quick-time" aria-label="Quick timer remaining">
        {duration(remaining)}
      </output>
      <div className="hs-quick-controls">
        <button
          className={running ? "pause" : "play"}
          aria-label={
            running
              ? "Pause quick timer"
              : active
                ? "Resume quick timer"
                : "Start quick timer"
          }
          onClick={playPause}
        >
          <Icon name={running ? "pause" : "play"} />
        </button>
        <button
          aria-label="Reset quick timer"
          disabled={!timer}
          onClick={reset}
        >
          <Icon name="retry" />
        </button>
      </div>
    </div>
  );
}
