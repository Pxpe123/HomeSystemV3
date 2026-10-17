import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { runtime, server } from "../../application/services";
import { useHome, useConnection } from "../../application/useHome";
import { NotificationList } from "./NotificationList";
import { Icon } from "../../shared/ui/Icon";
import "./runtime.css";

export function NotificationShade() {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(null);
  const notifications = useHome((state) => state.notifications);
  const preferences = useHome((state) => state.preferences);
  const toast = useHome((state) => state.toast);
  const { status } = useConnection();
  const dialog = useRef(null),
    trigger = useRef(null),
    gesture = useRef(null);
  const unread = notifications.filter((item) => !item.read).length;
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    const opener = trigger.current;
    node.showModal();
    return () => {
      node.close();
      opener?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => runtime.dismissToast(), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  function pointerStart(event, direction) {
    if (event.button && event.button !== 0) return;
    event.stopPropagation();
    gesture.current = { y: event.clientY, x: event.clientX, direction };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ direction, distance: 0 });
    if (direction === "down") setOpen(true);
  }
  function pointerMove(event) {
    const start = gesture.current;
    if (!start) return;
    event.stopPropagation();
    const distance =
      start.direction === "down"
        ? event.clientY - start.y
        : start.y - event.clientY;
    setDrag({ direction: start.direction, distance: Math.max(0, distance) });
  }
  function pointerEnd(event, direction) {
    const start = gesture.current;
    gesture.current = null;
    setDrag(null);
    if (!start) return;
    event.stopPropagation();
    if (direction === "down")
      setOpen(
        event.clientY - start.y > 80 && Math.abs(event.clientX - start.x) < 120,
      );
    if (direction === "up" && start.y - event.clientY > 60) setOpen(false);
  }
  return (
    <>
      <button
        ref={trigger}
        className="hs-statusbar"
        aria-label={`Open notification shade, ${unread} unread`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          if (event.detail === 0) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        onPointerDown={(event) => pointerStart(event, "down")}
        onPointerMove={pointerMove}
        onPointerUp={(event) => pointerEnd(event, "down")}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
          setOpen(false);
        }}
      >
        <span className={`hs-connection ${status}`}>
          <i />
          {status === "online"
            ? "Connected"
            : status === "connecting"
              ? "Connecting"
              : "Offline"}
        </span>
        <span className="hs-pull-handle" />
        <span>
          <Icon name="bell" /> {unread || ""}
          {preferences.doNotDisturb ? " · Quiet mode" : ""}
        </span>
      </button>
      <dialog
        ref={dialog}
        className="hs-shade"
        data-dragging={!!drag}
        aria-labelledby="hs-shade-title"
        onCancel={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialog.current) setOpen(false);
        }}
      >
        <div
          className="hs-shade-surface"
          style={
            drag
              ? {
                  transform:
                    drag.direction === "down"
                      ? `translateY(min(0px, calc(-100% + ${drag.distance * 2.5}px)))`
                      : `translateY(-${drag.distance}px)`,
                  transition: "none",
                }
              : undefined
          }
        >
          <button
            className="hs-shade-handle"
            aria-label="Close notification shade"
            onClick={(event) => {
              if (event.detail === 0) setOpen(false);
            }}
            onPointerDown={(event) => pointerStart(event, "up")}
            onPointerMove={pointerMove}
            onPointerUp={(event) => pointerEnd(event, "up")}
            onPointerCancel={() => {
              gesture.current = null;
              setDrag(null);
            }}
            onKeyDown={(event) => {
              if (["Enter", " ", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                setOpen(false);
              }
            }}
          >
            <span />
          </button>
          <header>
            <div>
              <h2 id="hs-shade-title">Notifications</h2>
              <p>
                {unread ? `${unread} unread updates` : "You’re all caught up"}
              </p>
            </div>
            <button
              className="hs-icon-button"
              autoFocus
              aria-label="Close notification shade"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" />
            </button>
          </header>
          <div className="hs-quick-settings">
            <button
              aria-pressed={preferences.doNotDisturb}
              onClick={() =>
                runtime.setPreferences({
                  doNotDisturb: !preferences.doNotDisturb,
                })
              }
            >
              <Icon name="moon" /> Quiet mode{" "}
              {preferences.doNotDisturb ? "on" : "off"}
            </button>
            <button
              onClick={() => {
                server.stop();
                server.connect();
              }}
            >
              <Icon name="retry" /> Reconnect
            </button>
            <Link to="/app/settings" onClick={() => setOpen(false)}>
              <Icon name="settings" /> Settings
            </Link>
          </div>
          <div className="hs-shade-toolbar">
            <span>Saved on this display</span>
            {toast?.action === "undo" && (
              <button onClick={() => runtime.undoNotifications()}>
                Undo dismissal
              </button>
            )}
            <button disabled={!unread} onClick={() => runtime.read("all")}>
              Mark all read
            </button>
          </div>
          <NotificationList onNavigate={() => setOpen(false)} />
          <button
            className="hs-shade-handle"
            aria-label="Swipe up to close notifications"
            onClick={(event) => {
              if (event.detail === 0) setOpen(false);
            }}
            onPointerDown={(event) => pointerStart(event, "up")}
            onPointerMove={pointerMove}
            onPointerUp={(event) => pointerEnd(event, "up")}
            onPointerCancel={() => {
              gesture.current = null;
              setDrag(null);
            }}
            onKeyDown={(event) => {
              if (["Enter", " ", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                setOpen(false);
              }
            }}
          >
            <span />
          </button>
        </div>
      </dialog>
      <div className="hs-toast-region" aria-live="polite" aria-atomic="true">
        {toast && !open && (
          <div className="hs-toast">
            <Icon name={toast.tone === "success" ? "success" : "bell"} />
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
              {toast.action === "undo" && (
                <button
                  className="hs-undo"
                  onClick={() => runtime.undoNotifications()}
                >
                  Undo
                </button>
              )}
            </div>
            <button
              aria-label="Dismiss notification"
              className="hs-icon-button"
              onClick={() => runtime.dismissToast()}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
