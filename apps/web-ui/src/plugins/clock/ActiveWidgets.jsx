import { Link } from "react-router-dom";
import { runtime } from "../../application/services";
import { Icon } from "../../shared/ui/Icon";
import { duration } from "../../shared/hooks/useClock";
import { timerRemaining } from "./timer";
export function TimerWidget({ timer, now }) {
  const remaining = timerRemaining(timer, now);
  const progress = Math.max(0, Math.min(1, remaining / timer.duration));
  return (
    <article className="hs-timer-widget">
      <header>
        <span>
          <Icon name="timer" /> TIMER
        </span>
        <Link to="/app/clock">
          {timer.label} <Icon name="arrow" />
        </Link>
      </header>
      <div
        className="hs-timer-face"
        style={{ "--timer-progress": `${progress * 100}%` }}
      >
        <output>
          {timer.status === "complete" ? "Ready" : duration(remaining)}
        </output>
        <small>
          {timer.status === "running"
            ? "Time remaining"
            : timer.status === "paused"
              ? "Paused"
              : "Your timer has finished"}
        </small>
      </div>
      <div className="hs-widget-actions">
        {timer.status !== "complete" && (
          <button onClick={() => runtime.toggleTimer(timer.id)}>
            <Icon name={timer.status === "running" ? "pause" : "play"} />
            {timer.status === "running" ? "Pause" : "Resume"}
          </button>
        )}
        <button onClick={() => runtime.removeTimer(timer.id)}>
          {timer.status === "complete" ? "Dismiss" : "Cancel"}
        </button>
      </div>
    </article>
  );
}
export function StopwatchWidget({ stopwatch }) {
  return (
    <article className="hs-timer-widget">
      <header>
        <span>
          <Icon name="timer" /> STOPWATCH
        </span>
        <Link to="/app/clock">
          Open <Icon name="arrow" />
        </Link>
      </header>
      <div className="hs-timer-face">
        <output>{duration(runtime.stopwatchElapsed())}</output>
        <small>{stopwatch.startedAt === null ? "Paused" : "Counting up"}</small>
      </div>
      <div className="hs-widget-actions">
        <button onClick={() => runtime.toggleStopwatch()}>
          <Icon name={stopwatch.startedAt === null ? "play" : "pause"} />
          {stopwatch.startedAt === null ? "Resume" : "Pause"}
        </button>
        <button onClick={() => runtime.resetStopwatch()}>Reset</button>
      </div>
    </article>
  );
}
