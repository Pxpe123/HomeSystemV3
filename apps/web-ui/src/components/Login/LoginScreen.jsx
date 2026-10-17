import { useState } from "react";
import { useProfile } from "../../context/ProfileContext";
import { useWebSocket } from "../../context/WebSocketContext";
import ProfileSelector from "./ProfileSelector";
import "./LoginScreen.css";

export default function LoginScreen() {
  const { connected } = useWebSocket();
  const {
    profiles,
    isLoading,
    error,
    storedProfileId,
    login,
    createProfile,
    fetchProfiles,
    clearError,
  } = useProfile();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState("");
  async function choose(profile) {
    if (busy || !connected) return;
    setBusy(true);
    try {
      await login(profile.id);
    } finally {
      setBusy(false);
    }
  }
  async function create(event) {
    event.preventDefault();
    if (busy || !connected) return;
    if (!name.trim()) {
      setValidation("Enter a profile name.");
      return;
    }
    setBusy(true);
    try {
      await createProfile(name.trim());
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-screen">
      <div className="login-card" aria-busy={busy || isLoading}>
        {!connected ? (
          <p role="status">Connecting to your home server…</p>
        ) : isLoading ? (
          <p role="status">Loading household profiles…</p>
        ) : (
          <>
            {creating ? (
              <div className="create-user-view">
                <h2 className="create-title">Create profile</h2>
                <p className="create-subtitle">
                  Saved on your home server. No password needed.
                </p>
                <form noValidate onSubmit={create} className="create-form">
                  <label htmlFor="login-profile-name">Profile name</label>
                  <input
                    id="login-profile-name"
                    value={name}
                    maxLength={60}
                    autoFocus
                    disabled={busy}
                    aria-invalid={!!validation || !!error}
                    aria-describedby={
                      validation
                        ? "profile-name-error"
                        : error
                          ? "profile-server-error"
                          : undefined
                    }
                    onChange={(event) => {
                      setName(event.target.value);
                      setValidation("");
                      clearError();
                    }}
                    className="create-input"
                  />
                  {validation && (
                    <p
                      id="profile-name-error"
                      className="create-error"
                      role="alert"
                    >
                      {validation}
                    </p>
                  )}
                  <button
                    className="create-submit"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Saving…" : "Create profile"}
                  </button>
                  <button
                    className="create-user-button"
                    disabled={busy}
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      clearError();
                    }}
                  >
                    Back to profiles
                  </button>
                </form>
              </div>
            ) : (
              <ProfileSelector
                profiles={profiles}
                onSelect={choose}
                busy={busy}
                onCreate={() => {
                  setCreating(true);
                  clearError();
                }}
                storedProfileId={storedProfileId}
              />
            )}
            {busy && <p role="status">Opening your profile…</p>}
            {error && (
              <div id="profile-server-error" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className="create-user-button"
                  disabled={busy}
                  onClick={() =>
                    fetchProfiles()
                      .then(clearError)
                      .catch(() => {})
                  }
                >
                  Retry loading profiles
                </button>
              </div>
            )}
            <p className="selector-subtitle">
              Profiles personalise this home. Anyone with access to this display
              can choose one.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
