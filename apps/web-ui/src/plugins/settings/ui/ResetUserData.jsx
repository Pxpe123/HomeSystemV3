import { useEffect, useState } from "react";
import { Modal } from "../../../shared/ui/Modal";
import { useConnection } from "../../../application/useHome";
import { server } from "../../../application/services";
import { useProfile } from "../../../context/ProfileContext";

export default function ResetUserData() {
  const { status, connectedAt } = useConnection();
  const { deleteAllUserData } = useProfile();
  const [policy, setPolicy] = useState(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (status !== "online") return;
    let cancelled = false;
    server
      .request("System/GetDataPolicy")
      .then((result) => {
        if (!cancelled)
          setPolicy({
            enabled: result.data?.resetEnabled === true,
            connectedAt,
          });
      })
      .catch(() => {
        if (!cancelled) setPolicy({ error: true, connectedAt });
      });
    return () => {
      cancelled = true;
    };
  }, [status, connectedAt]);
  const enabled =
    status === "online" &&
    policy?.connectedAt === connectedAt &&
    policy?.enabled;
  const policyMessage =
    status !== "online"
      ? "Connect to the home server to check testing controls."
      : policy?.connectedAt !== connectedAt
        ? "Checking server testing controls…"
        : policy?.error
          ? "Unable to check deletion permissions. Reconnect to retry."
          : enabled
            ? "Enabled for testing. This cannot be undone."
            : "Disabled unless HOMESYSTEM_ALLOW_DATA_RESET=true is set on the server.";
  async function remove() {
    if (busy || text !== "DELETE ALL USER DATA" || !enabled) return;
    setBusy(true);
    setError("");
    try {
      await deleteAllUserData();
    } catch (failure) {
      setError(
        failure.message ||
          "Deletion was not confirmed. Reconnect and check before trying again.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="hs-setting-card">
      <div className="hs-setting-row">
        <span>
          <strong>Testing · delete all user data</strong>
          <small>
            Delete every household profile and saved Spotify credential on the
            server, plus this display’s timers, notifications and preferences.
            Other connected displays clear their local data when they next
            refresh profiles. Server connection and installed apps remain.
          </small>
          <small>{policyMessage}</small>
          <button
            className="hs-button danger"
            disabled={!enabled}
            onClick={() => {
              setOpen(true);
              setText("");
              setError("");
            }}
          >
            Delete all user data
          </button>
        </span>
      </div>
      {open && (
        <Modal
          title="Delete all user data?"
          id="delete-user-data"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
          description="All profiles and stored Spotify credentials will be permanently removed from this home server. Timers and notification history on this display will be cleared. This does not revoke Spotify’s app permission or erase offline displays until they reconnect."
        >
          <label htmlFor="delete-user-data-confirmation">
            Type DELETE ALL USER DATA to confirm
          </label>
          <input
            id="delete-user-data-confirmation"
            value={text}
            disabled={busy}
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
            aria-describedby={error ? "delete-user-data-error" : undefined}
          />
          {error && (
            <p id="delete-user-data-error" role="alert">
              {error}
            </p>
          )}
          <button
            autoFocus
            className="hs-button secondary"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Keep user data
          </button>
          <button
            className="hs-button danger"
            disabled={busy || !enabled || text !== "DELETE ALL USER DATA"}
            onClick={remove}
          >
            {busy ? "Deleting…" : "Delete all user data"}
          </button>
        </Modal>
      )}
    </div>
  );
}
