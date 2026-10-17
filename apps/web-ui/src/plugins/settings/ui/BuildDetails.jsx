import { useEffect, useState } from "react";
import { server } from "../../../application/services";
import { useConnection } from "../../../application/useHome";
import { compareBuilds, formatBuildTime } from "./buildDetails.js";

const webBuild = import.meta.env.HOMESYSTEM_BUILD;

export default function BuildDetails() {
  const { status, connectedAt } = useConnection();
  const [result, setResult] = useState({});
  useEffect(() => {
    if (status !== "online") return;
    let cancelled = false;
    server
      .request("System/Hello")
      .then((response) => {
        if (!cancelled) setResult({ build: response.data?.build, connectedAt });
      })
      .catch(() => {
        if (!cancelled) setResult({ error: true, connectedAt });
      });
    return () => {
      cancelled = true;
    };
  }, [status, connectedAt]);
  const fresh = status === "online" && result.connectedAt === connectedAt;
  const state =
    status !== "online"
      ? "Offline — server build not checked"
      : !fresh
        ? "Checking server build…"
        : result.error
          ? "Could not check server build — reconnect to retry"
          : compareBuilds(webBuild, result.build);
  return (
    <div className="hs-setting-card" aria-label="Build information">
      <div className="hs-setting-row">
        <span>
          <strong>Deployment build</strong>
          <small role="status">{state}</small>
        </span>
      </div>
      {["WebUI", "ControlServer"].map((name, index) => {
        const build = index === 0 ? webBuild : fresh ? result.build : null;
        return (
          <div className="hs-setting-row" key={name}>
            <span>
              <strong>
                {name} · {build?.version || "Version unavailable"}
              </strong>
              <small>Build {build?.buildId || "unavailable"}</small>
              <small>Commit {build?.commit || "unavailable"}</small>
              <small>Built {formatBuildTime(build?.builtAtUtc)}</small>
            </span>
          </div>
        );
      })}
      <p className="hs-settings-note">
        Matching build identities confirm the loaded versions, not that every
        app integration has been tested.
      </p>
      <p className="hs-settings-note">
        Timers and saved local preferences remain available without a
        connection. Connected services need the home server.
      </p>
    </div>
  );
}
