import { useState } from "react";
import { Link } from "react-router-dom";
import { AppTopBar } from "../../app/Apps/components";
import { runtime } from "../../application/services";
import { useHome } from "../../application/useHome";
import { useClock, duration } from "../../shared/hooks/useClock";
import { Icon } from "../../shared/ui/Icon";
import "../../app/Apps/AppPage.css";
import "./TimerApp.css";
import { timerRemaining } from "./timer";

export function TimerApp() {
  const timers = useHome((state) => state.timers);
  const stopwatch = useHome((state) => state.stopwatch);
  const now = useClock();
  const [label, setLabel] = useState(""),
    [minutes, setMinutes] = useState("5"),
    [error, setError] = useState("");
  function start(event) {
    event.preventDefault();
    try {
      runtime.startTimer(label, Number(minutes) * 60);
      setLabel("");
      setError("");
    } catch (failure) {
      setError(failure.message);
      document.getElementById("hs-timer-duration").focus();
    }
  }
  return (
    <div className="app-page hs-runtime">
      <AppTopBar
        title="Timers & stopwatch"
        description="Keep time around your home. Timers carry on when you leave this screen."
      />
      <div className="app-content hs-timers">
        <section className="hs-timer-panel">
          <h2>New timer</h2>
          <form className="hs-timer-form" onSubmit={start} noValidate>
            <label htmlFor="hs-timer-label">Timer name</label>
            <input
              id="hs-timer-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={60}
              placeholder="Tea, dinner, time to focus…"
            />
            <label htmlFor="hs-timer-duration">Minutes</label>
            <input
              id="hs-timer-duration"
              type="number"
              inputMode="decimal"
              step="any"
              min="0.017"
              max="1440"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "hs-timer-error" : undefined}
            />
            <div className="hs-presets">
              {[1, 5, 15, 30].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setMinutes(String(value))}
                >
                  {value} min
                </button>
              ))}
            </div>
            {error && (
              <p id="hs-timer-error" className="hs-field-error" role="alert">
                {error}
              </p>
            )}
            <button className="hs-primary" type="submit">
              <Icon name="play" /> Start timer
            </button>
          </form>
          <p className="hs-helper">
            Timers continue across apps and reloads on this display. Keep a
            panel open to receive completion alerts.
          </p>
        </section>
        <section className="hs-timer-panel">
          <h2>Your timers</h2>
          <div className="hs-timer-list">
            {timers.length ? (
              timers.map((timer) => (
                <article key={timer.id} className="hs-timer-card">
                  <div>
                    <strong>{timer.label}</strong>
                    <small>
                      {timer.status === "complete" ? "Ready" : timer.status}
                    </small>
                  </div>
                  <output>{duration(timerRemaining(timer, now))}</output>
                  <div className="hs-timer-actions">
                    {timer.status !== "complete" && (
                      <button onClick={() => runtime.toggleTimer(timer.id)}>
                        <Icon
                          name={timer.status === "running" ? "pause" : "play"}
                        />{" "}
                        {timer.status === "running" ? "Pause" : "Resume"}
                      </button>
                    )}
                    <button onClick={() => runtime.removeTimer(timer.id)}>
                      {timer.status === "complete" ? "Dismiss" : "Cancel"}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="hs-helper">
                No active timers. Start one and it will also appear on your home
                screen.
              </p>
            )}
          </div>
          <div className="hs-stopwatch">
            <h3>Stopwatch</h3>
            <output>{duration(runtime.stopwatchElapsed())}</output>
            <div className="hs-timer-actions">
              <button onClick={() => runtime.toggleStopwatch()}>
                {stopwatch.startedAt === null ? "Start / resume" : "Pause"}
              </button>
              <button onClick={() => runtime.resetStopwatch()}>Reset</button>
            </div>
          </div>
          <Link to="/" className="hs-helper">
            Back to overview
          </Link>
        </section>
      </div>
    </div>
  );
}
