import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Icon } from "./Icon";
import AppTopBar from "../../app/Apps/components/AppTopBar";
import "../../app/Apps/AppPage.css";
import "./primitives.css";

/** Canonical empty, unavailable and loading treatment for full-page and widget surfaces. */
export function AppState({
  title,
  description,
  icon = "apps",
  children,
  loading = false,
}) {
  return (
    <div
      className="hs-app-state"
      role={loading ? "status" : undefined}
      aria-live={loading ? "polite" : undefined}
    >
      <span className={`hs-state-icon ${loading ? "is-loading" : ""}`}>
        <Icon name={loading ? "retry" : icon} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children && <div className="hs-state-actions">{children}</div>}
    </div>
  );
}
export function AppLoading({ title, icon, color }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(timer);
  }, []);
  const feedback = visible ? (
    <div
      className="hs-app-state hs-branded-loading"
      role="status"
      aria-live="polite"
      style={{ "--loading-accent": color || "var(--accent-primary)" }}
    >
      <span className="hs-loading-emblem" aria-hidden="true">
        {icon ? <FontAwesomeIcon icon={icon} /> : <Icon name="apps" />}
      </span>
      <h2>{title || "Your app"}</h2>
      <p>Getting ready…</p>
      <span className="hs-loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  ) : null;
  return title ? (
    <div className="app-page" aria-busy="true">
      <AppTopBar title={title} />
      {feedback}
    </div>
  ) : (
    feedback
  );
}
export function AppUnavailable() {
  return (
    <AppState
      title="App not available"
      description="Install this app from the library to use it on this display."
    >
      <Link className="hs-button" to="/app-library">
        Browse app library
      </Link>
      <Link className="hs-button secondary" to="/">
        Back to home
      </Link>
    </AppState>
  );
}
