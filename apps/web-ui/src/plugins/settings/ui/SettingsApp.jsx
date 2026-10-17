import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { AppTopBar } from "../../../app/Apps/components";
import { useProfile, useWebSocket } from "../../../context";
import { useHome } from "../../../application/useHome";
import { runtime, server } from "../../../application/services";
import { Icon } from "../../../shared/ui/Icon";
import "../../../app/Apps/AppPage.css";
import "./SettingsApp.css";

const BuildDetails = lazy(() => import('./BuildDetails.jsx'));

const sections = [
  {
    id: "display",
    name: "Display & feel",
    icon: "settings",
    description: "Make this display feel at home.",
  },
  {
    id: "notifications",
    name: "Sound & notifications",
    icon: "bell",
    description: "Choose how your home gets your attention.",
  },
  {
    id: "profile",
    name: "Household",
    icon: "home",
    description: "Your profile and the people at home.",
  },
  {
    id: "connection",
    name: "Connection",
    icon: "retry",
    description: "Your connection to the home server.",
  },
];
function Toggle({ label, description, checked, onChange, disabled = false }) {
  return (
    <label className="hs-setting-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
export default function SettingsApp({ embedded = false }) {
  const preferences = useHome((state) => state.preferences);
  const { currentProfile, profiles, logout, createProfile } = useProfile();
  const { connected, serverUrl } = useWebSocket();
  const [section, setSection] = useState("display");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = sections.find((item) => item.id === section);
  async function addProfile(event) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("Enter a name for this profile.");
      return;
    }
    if (passcode && !/^\d{4,6}$/.test(passcode)) {
      setError("Use 4 to 6 digits for the passcode, or leave it empty.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await createProfile(name.trim(), passcode || null);
      if (result?.success === false)
        throw new Error(result.error || "Could not create the profile.");
      setName("");
      setPasscode("");
      setAdding(false);
      runtime.notify({
        title: "Profile created",
        message: "You are now using the new profile.",
        tone: "success",
      });
    } catch (failure) {
      setError(
        failure.message ||
          "Could not create the profile. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`app-page settings-app hs-settings ${embedded ? "hs-settings-embedded" : ""}`}
    >
      {embedded ? (
        <header className="hs-settings-page-heading">
          <div>
            <span className="hs-eyebrow">MAKE YOURSELF AT HOME</span>
            <h1>Settings</h1>
          </div>
          <span>Home display</span>
        </header>
      ) : (
        <AppTopBar title="Settings" />
      )}
      <div className="app-content hs-settings-layout">
        <nav className="hs-settings-nav" aria-label="Settings sections">
          <div className="hs-settings-identity">
            <span>{currentProfile?.name?.charAt(0)?.toUpperCase() || "H"}</span>
            <div>
              <strong>{currentProfile?.name || "Your home"}</strong>
              <small>This home display</small>
            </div>
          </div>
          {sections.map((item) => (
            <button
              key={item.id}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => setSection(item.id)}
            >
              <Icon name={item.icon} />
              {item.name}
            </button>
          ))}
          <Link to="/app-library">
            <Icon name="apps" />
            Manage apps<span>↗</span>
          </Link>
          <p className="hs-settings-footnote">
            HomeSystem
            <br />
            Preferences saved on this display
          </p>
        </nav>
        <section
          className="hs-settings-panel"
          aria-labelledby="settings-heading"
        >
          <header>
            <span className="hs-eyebrow">YOUR HOME, YOUR WAY</span>
            <h2 id="settings-heading">{active.name}</h2>
            <p>{active.description}</p>
          </header>
          {section === "display" && (
            <>
              <div className="hs-setting-card">
                <div className="hs-appearance-preview">
                  <div>
                    <span>12:45</span>
                    <small>A quieter kind of home.</small>
                  </div>
                  <i />
                  <i />
                </div>
                <div className="hs-setting-row">
                  <span>
                    <strong>Midnight coast</strong>
                    <small>Soft aqua, deep blue and translucent glass</small>
                  </span>
                  <span className="hs-setting-badge">Active</span>
                </div>
              </div>
              <div className="hs-setting-card">
                <Toggle
                  label="Reduced effects"
                  description="Keep transitions still and glass effects lighter."
                  checked={preferences.reducedEffects}
                  onChange={(value) =>
                    runtime.setPreferences({ reducedEffects: value })
                  }
                />
              </div>
              <p className="hs-settings-note">
                Your familiar home layout stays the same. Swipe sideways for
                apps, and pull down from the top for notifications.
              </p>
              <p className="hs-settings-note">
                Sun times use Liverpool’s date and Europe/London timezone.
                Preview times are calculated; connected-server sun data is by{" "}
                <a
                  href="https://sunrise-sunset.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  Sunrise-Sunset.org
                </a>
                . Preview weather is sample data, not a live forecast.
              </p>
            </>
          )}
          {section === "notifications" && (
            <div className="hs-setting-card">
              <Toggle
                label="Quiet mode"
                description="Save notifications without interrupting you."
                checked={preferences.doNotDisturb}
                onChange={(value) =>
                  runtime.setPreferences({ doNotDisturb: value })
                }
              />
              <Toggle
                label="Timer sounds"
                description="Play a sound when a timer finishes."
                checked={preferences.soundEnabled}
                onChange={(value) =>
                  runtime.setPreferences({ soundEnabled: value })
                }
              />
              <Toggle
                label="Vibration"
                description={
                  typeof navigator.vibrate === "function"
                    ? "Vibrate this device when a timer finishes."
                    : "Vibration is not supported on this device."
                }
                disabled={typeof navigator.vibrate !== "function"}
                checked={preferences.vibrationEnabled}
                onChange={(value) =>
                  runtime.setPreferences({ vibrationEnabled: value })
                }
              />
            </div>
          )}
          {section === "profile" && (
            <>
              <div className="hs-setting-card">
                {profiles.map((profile) => (
                  <div className="hs-setting-row" key={profile.id}>
                    <span>
                      <strong>{profile.name}</strong>
                      <small>
                        {profile.id === currentProfile?.id
                          ? "Using this display now"
                          : "Household profile"}
                      </small>
                    </span>
                    {profile.id === currentProfile?.id && (
                      <span className="hs-setting-badge">Current</span>
                    )}
                  </div>
                ))}
              </div>
              {adding ? (
                <form
                  className="hs-profile-form"
                  noValidate
                  onSubmit={addProfile}
                >
                  <label htmlFor="household-name">Profile name</label>
                  <input
                    id="household-name"
                    autoFocus
                    value={name}
                    maxLength={60}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={!!error && !name.trim()}
                  />
                  <label htmlFor="household-pin">Passcode · optional</label>
                  <input
                    id="household-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={6}
                    value={passcode}
                    onChange={(event) => setPasscode(event.target.value)}
                    aria-describedby={error ? "profile-error" : undefined}
                  />
                  {error && (
                    <p id="profile-error" role="alert">
                      {error}
                    </p>
                  )}
                  <div>
                    <button type="submit" disabled={busy || !connected}>
                      {busy ? "Creating…" : "Create profile"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setAdding(false);
                        setPasscode("");
                        setError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className="hs-settings-action"
                  disabled={!connected}
                  onClick={() => setAdding(true)}
                >
                  Add household profile
                </button>
              )}
              <button className="hs-settings-action secondary" onClick={logout}>
                Switch profile
              </button>
              <p className="hs-settings-note">
                Passcode protection is managed by the home server. This screen
                does not change security settings.
              </p>
            </>
          )}
          {section === "connection" && (
            <>
              <Suspense fallback={<p className="hs-settings-note" role="status">Loading build details…</p>}>
                <BuildDetails />
              </Suspense>
              <div className="hs-setting-card">
                <div className="hs-setting-row">
                  <span>
                    <strong>Home server</strong>
                    <small>
                      {connected
                        ? "Ready for connected apps and devices"
                        : "Check that your home server is running"}
                    </small>
                  </span>
                  <span className="hs-setting-badge">
                    {connected ? "Connected" : "Offline"}
                  </span>
                </div>
                <div className="hs-setting-row">
                  <span>
                    <strong>Server address</strong>
                    <small className="hs-server-address">
                      {serverUrl || "Not configured"}
                    </small>
                  </span>
                </div>
              </div>
              <button
                className="hs-settings-action"
                onClick={() => {
                  server.stop();
                  server.connect();
                }}
              >
                Reconnect to server
              </button>
              <Link className="hs-settings-action" to="/setup">Set up server connection</Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
