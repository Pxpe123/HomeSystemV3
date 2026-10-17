import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { connectionSettings, server } from "../../application/services";
import { useConnection } from "../../application/useHome";
import "./SetupGate.css";

/** Setup runs before profile requests. An open socket alone is not server identity. */
export function SetupGate({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(() => Boolean(connectionSettings.load()));
  const [address, setAddress] = useState(server.url);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const { status } = useConnection();
  const addressInput = useRef(null);
  const attempt = useRef(0);
  const forced = pathname === "/setup";
  const active = forced || !ready;
  useEffect(() => {
    if (active) document.title = "Setup · HomeSystem";
  }, [active]);

  useEffect(() => {
    if (!active || status !== "online") return;
    let cancelled = false;
    const current = ++attempt.current;
    server
      .request("System/Hello")
      .then((reply) => {
        if (cancelled || current !== attempt.current) return;
        if (
          reply.data?.service !== "HomeSystem.ControlServer" ||
          reply.data?.protocolVersion !== 1
        )
          throw new Error(
            "This address did not identify a compatible HomeSystem server.",
          );
        setVerified(true);
        setBusy(false);
        setError("");
      })
      .catch((failure) => {
        if (!cancelled && current === attempt.current) {
          setError(failure.message);
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, status]);

  useEffect(() => {
    if (!busy || verified) return;
    const timer = setTimeout(() => {
      setBusy(false);
      setError(
        "No HomeSystem response. Check the address, server and Wi-Fi, then try again.",
      );
    }, 12000);
    return () => clearTimeout(timer);
  }, [busy, verified]);

  if (!active) return children;
  function connect(event) {
    event.preventDefault();
    try {
      const endpoint = connectionSettings.normalize(address);
      setVerified(false);
      setError("");
      setBusy(true);
      server.configureEndpoint(endpoint);
    } catch (failure) {
      setError(failure.message);
      addressInput.current?.focus();
    }
  }
  function finish() {
    if (!connectionSettings.save(server.url)) {
      setError(
        "This browser cannot save settings. You can continue, but setup will appear next time.",
      );
      setUnsaved(true);
      return;
    }
    setReady(true);
    navigate("/");
  }
  return (
    <main className="hs-setup MainContainer-ImageBG">
      <section className="hs-setup-card" aria-labelledby="setup-title">
        <p className="hs-eyebrow">HOME SYSTEM</p>
        <h1 id="setup-title">Connect your display</h1>
        <p>One connection for your apps, devices and home.</p>
        <form noValidate onSubmit={connect}>
          <label htmlFor="setup-address">Home server address</label>
          <input
            id="setup-address"
            ref={addressInput}
            type="url"
            value={address}
            onChange={(event) => {
              ++attempt.current;
              setAddress(event.target.value);
              setVerified(false);
            }}
            autoComplete="url"
            spellCheck="false"
            aria-invalid={Boolean(error)}
            aria-describedby="setup-help setup-status"
            disabled={busy}
          />
          <p id="setup-help">
            Detected automatically from this display. On another device, use
            your home server’s address—not localhost. Production displays use
            the same-origin /ws gateway.
          </p>
          <div id="setup-status" role="status" className="hs-setup-status">
            {error ||
              (verified
                ? "HomeSystem server verified. Ready to continue."
                : busy
                  ? "Connecting to your home…"
                  : status === "connecting"
                    ? "Checking the detected server…"
                    : "Check your address, then connect.")}
          </div>
          <button
            className="hs-button hs-button-primary"
            disabled={busy}
            type="submit"
          >
            {busy ? "Connecting…" : "Test connection"}
          </button>
          {verified && (
            <button
              className="hs-button"
              type="button"
              disabled={status !== "online"}
              onClick={finish}
            >
              Continue to profiles
            </button>
          )}
          {unsaved && (
            <button
              className="hs-button"
              type="button"
              onClick={() => {
                setReady(true);
                navigate("/");
              }}
            >
              Continue without saving
            </button>
          )}
          {forced && ready && (
            <Link
              className="hs-button"
              to="/"
              onClick={() =>
                server.configureEndpoint(
                  connectionSettings.load()?.endpoint ||
                    connectionSettings.fallback,
                )
              }
            >
              Cancel
            </Link>
          )}
        </form>
      </section>
    </main>
  );
}
