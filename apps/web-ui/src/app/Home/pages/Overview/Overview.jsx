import { ActiveApps } from "../../../../components";
import { PluginDashboards } from "../../../../application/PluginHost";
import "./Overview.css";
export default function Overview() {
  return (
    <div className="Page overview-page">
      <PluginDashboards />
      <div className="hs-dashboard-slot" style={{ gridArea: "active" }}>
        <ActiveApps />
      </div>
    </div>
  );
}
