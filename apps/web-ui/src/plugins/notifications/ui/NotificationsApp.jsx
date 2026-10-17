/*
 * NotificationsApp - Notification center
 * Shows all system notifications and alerts
 */

import { useAppState } from "../../../application/useAppState";
import { useHome } from "../../../application/useHome";
import { runtime } from "../../../application/services";
import { NotificationList } from "../../../features/notifications/NotificationList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCheck, faTrash } from "@fortawesome/free-solid-svg-icons";
import { AppTopBar } from "../../../app/Apps/components";
import "../../../app/Apps/AppPage.css";
import "./NotificationsApp.css";

export default function NotificationsApp() {
  const notifications = useHome((state) => state.notifications);
  const [filter, setFilter] = useAppState("notifications", "filter", "all");
  const unreadCount = notifications.filter((item) => !item.read).length;
  const markAllAsRead = () => runtime.read("all");
  const clearAll = () => runtime.clearNotifications();

  return (
    <div className="app-page notifications-app">
      <AppTopBar
        title="Notifications"
        description="Updates and reminders from your home, all in one place."
      />

      <div className="app-content notifications-layout">
        <aside
          className="notifications-sidebar"
          aria-label="Notification filters"
        >
          <div className="notifications-summary">
            <FontAwesomeIcon icon={faBell} />
            <strong>{unreadCount}</strong>
            <span>Unread notifications</span>
            <small>Saved on this display</small>
          </div>
          <div
            className="notifications-filter"
            role="group"
            aria-label="Show notifications"
          >
            {["all", "unread", "read"].map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                <span>{f.charAt(0).toUpperCase() + f.slice(1)}</span>
                <span>
                  {f === "all"
                    ? notifications.length
                    : f === "unread"
                      ? unreadCount
                      : notifications.length - unreadCount}
                </span>
              </button>
            ))}
          </div>
          <p className="notifications-note">
            Timer completions, reminders and home updates stay here until you
            dismiss them.
          </p>
        </aside>
        <section
          className="notifications-feed"
          aria-label="Notification history"
        >
          {/* Header Actions */}
          <div className="notifications-header">
            <div className="notifications-count">
              <h2>
                {filter === "all"
                  ? "Your updates"
                  : filter === "unread"
                    ? "Unread updates"
                    : "Read updates"}
              </h2>
            </div>
            <div className="notifications-actions">
              <button onClick={markAllAsRead} disabled={unreadCount === 0}>
                <FontAwesomeIcon icon={faCheck} />
                <span>Mark all read</span>
              </button>
              <button onClick={clearAll} disabled={notifications.length === 0}>
                <FontAwesomeIcon icon={faTrash} />
                <span>Clear all</span>
              </button>
            </div>
          </div>

          <NotificationList filter={filter} />
        </section>
      </div>
    </div>
  );
}
