import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useHome, useConnection } from "../../../application/useHome";
import { usePlugins } from "../../../application/usePlugins";
import { useClock } from "../../../shared/hooks/useClock";
import "./ActiveApps.css";
import "./ActiveAppWidgets.css";

function ActiveWidget({ widget }) {
  const Component = widget.Component;
  return <Component {...widget.props} />;
}
export default function ActiveApps() {
  const snapshot = useHome();
  const { status } = useConnection();
  const { apps, manager } = usePlugins();
  const now = useClock();
  const [selected, setSelected] = useState(null);
  const gesture = useRef(null);
  const widgets = apps.flatMap((app) =>
    (
      manager.packages
        .get(app.id)
        ?.getActiveWidgets?.(snapshot, { now, online: status === "online" }) ||
      []
    ).map((widget) => ({ ...widget, id: app.id + ":" + widget.id })),
  );
  const index = Math.max(
    0,
    widgets.findIndex((widget) => widget.id === selected),
  );
  const go = (delta) => {
    const next = widgets[(index + delta + widgets.length) % widgets.length];
    if (next) setSelected(next.id);
  };
  function start(event) {
    event.stopPropagation();
    if (event.target.closest("button,a") || widgets.length < 2) return;
    gesture.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function end(event) {
    event.stopPropagation();
    const point = gesture.current;
    gesture.current = null;
    if (!point) return;
    const dx = event.clientX - point.x,
      dy = event.clientY - point.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5)
      go(dx < 0 ? 1 : -1);
  }
  return (
    <section
      className="ActiveApps-Container hs-active-apps"
      data-no-swipe
      aria-label="Active app widgets"
      aria-roledescription="carousel"
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={() => {
        gesture.current = null;
      }}
    >
      {widgets.length ? (
        <>
          {widgets.length > 1 && (
            <nav className="hs-widget-pager" aria-label="Active widgets">
              <div>
                {widgets.map((widget, position) => (
                  <button
                    key={widget.id}
                    className={position === index ? "selected" : ""}
                    aria-label={`Show ${widget.name} widget`}
                    aria-current={position === index ? "true" : undefined}
                    onClick={() => setSelected(widget.id)}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </nav>
          )}
          <div
            className="hs-widget-stage"
            key={widgets[index].id}
            aria-roledescription="slide"
            aria-label={`${widgets[index].name}, ${index + 1} of ${widgets.length}`}
          >
            <ActiveWidget widget={widgets[index]} />
          </div>
        </>
      ) : (
        <div className="apps-content">
          <span>NO ACTIVE BACKGROUND APPS</span>
          <Link className="hs-start-timer" to="/app-library">
            Browse apps
          </Link>
        </div>
      )}
    </section>
  );
}
