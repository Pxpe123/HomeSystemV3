import { Link } from "react-router-dom";
import { useHome, useConnection } from "../../../application/useHome";
import { usePlugins } from "../../../application/usePlugins";
import { AppTopBar } from "../../../app/Apps/components";
import { Icon } from "../../../shared/ui/Icon";
import "../../../app/Apps/AppPage.css";
import "./StatisticsApp.css";

export default function StatisticsApp({ embedded = false }) {
  const notifications = useHome((state) => state.notifications);
  const timers = useHome((state) => state.timers);
  const { status } = useConnection();
  const { apps } = usePlugins();
  const metrics = [
    {
      label: "Installed apps",
      value: apps.length,
      icon: "apps",
      to: "/app-library",
    },
    {
      label: "Running timers",
      value: timers.filter((timer) => timer.status === "running").length,
      icon: "timer",
      to: "/app/clock",
    },
    {
      label: "Unread notifications",
      value: notifications.filter((item) => !item.read).length,
      icon: "bell",
      to: "/app/notifications",
    },
  ];
  return (
    <div className="app-page hs-activity-page">
      {!embedded && <AppTopBar title="Home activity" />}
      <div className="hs-activity-content">
        <header>
          <span className="hs-eyebrow">A LITTLE PEACE OF MIND</span>
          <h2>Your home at a glance</h2>
          <p>Live information from this display. No simulated usage data.</p>
        </header>
        <div className="hs-activity-metrics">
          {metrics.map((metric) => (
            <Link
              key={metric.label}
              className="hs-activity-metric"
              to={metric.to}
            >
              <Icon name={metric.icon} />
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </Link>
          ))}
        </div>
        <section className="hs-activity-connection">
          <div>
            <Icon name="activity" />
            <h3>Home server</h3>
          </div>
          <span>
            {status === "online"
              ? "Connected"
              : status === "connecting"
                ? "Connecting…"
                : "Offline"}
          </span>
          <Link className="hs-button secondary" to="/app/settings">
            Connection settings
          </Link>
        </section>
        <section className="hs-activity-recent">
          <h3>Recent updates</h3>
          {notifications.length ? (
            <ul>
              {notifications.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <span className="hs-activity-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                  </div>
                  <time dateTime={new Date(item.createdAt).toISOString()}>
                    {new Date(item.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No updates yet. Timer completions and other home notifications
              will appear here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
