import { Link } from "react-router-dom";
import { useHome } from "../../application/useHome";
import { runtime } from "../../application/services";
import { Icon } from "../../shared/ui/Icon";
import { registry } from "../../core/AppRegistry";

/** Both the shade and Notifications app render this same state and actions. */
export function NotificationList({ filter = "all", onNavigate }) {
  const notifications = useHome(state => state.notifications);
  const visible = notifications.filter(
    (item) => filter === "all" || (filter === "read" ? item.read : !item.read),
  );
  return (
    <div className="hs-notification-list">
      {visible.length ? (
        visible.map((item) => (
          <article
            className={`hs-notification ${item.read ? "is-read" : ""}`}
            key={item.id}
          >
            <span className={`hs-notification-icon ${item.tone}`}>
              <Icon
                name={
                  item.tone === "success"
                    ? "success"
                    : item.tone === "warning" || item.tone === "error"
                      ? "warning"
                      : "bell"
                }
              />
            </span>
            <div className="hs-notification-copy">
              <h3>
                {item.title}
                {!item.read && (
                  <span className="hs-unread-dot" aria-label="Unread" />
                )}
              </h3>
              <p>{item.message}</p>
              <time dateTime={new Date(item.createdAt).toISOString()}>
                {new Date(item.createdAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              <div className="hs-notification-actions">
                {!item.read && (
                  <button onClick={() => runtime.read(item.id)}>
                    Mark read
                  </button>
                )}
                {registry.get(item.appId) && (
                  <Link
                    to={registry.get(item.appId).path}
                    onClick={() => {
                      runtime.read(item.id);
                      onNavigate?.();
                    }}
                  >
                    Open app
                  </Link>
                )}
              </div>
            </div>
            <button
              className="hs-icon-button"
              aria-label={`Dismiss ${item.title}`}
              onClick={() => runtime.removeNotification(item.id)}
            >
              <Icon name="close" />
            </button>
          </article>
        ))
      ) : (
        <div className="hs-empty">
          <Icon name="bell" />
          <p>
            {filter === "all"
              ? "No notifications yet"
              : `No ${filter} notifications`}
          </p>
          <small>Timer completions and home updates will appear here.</small>
        </div>
      )}
    </div>
  );
}
