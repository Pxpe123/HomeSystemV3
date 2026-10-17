import { Link } from "react-router-dom";
import { AppTopBar } from "../../app/Apps/components";
import { useConnection } from "../../application/useHome";
import { AppState } from "./AppState";
import "../../app/Apps/AppPage.css";

/** Deliberately honest boundary for integrations without an implemented UI data adapter. */
export function IntegrationPage({ title, icon, description }) {
  const { status } = useConnection();
  return (
    <div className="app-page">
      <AppTopBar title={title} />
      <div className="hs-integration-content">
        <AppState
          title={`${title} is not connected yet`}
          icon={icon}
          description={description}
        >
          <Link className="hs-button" to="/app/settings">
            Connection settings
          </Link>
          <Link className="hs-button secondary" to="/app-library">
            Manage apps
          </Link>
        </AppState>
        <p className="hs-integration-status">
          Home server: {status === "online" ? "connected" : status}. No sample
          devices or simulated controls are shown.
        </p>
      </div>
    </div>
  );
}
