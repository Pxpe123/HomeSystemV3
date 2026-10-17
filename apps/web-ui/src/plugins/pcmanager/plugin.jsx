import { lazyApp } from "../../application/lazyApp";
import { faDesktop } from "@fortawesome/free-solid-svg-icons";
const PcManagerApp = lazyApp(() => import("./ui/PcManagerApp"));
import PcManagerWidget from "./ui/PcManagerWidget";
export default {
  Page: PcManagerApp,
  DashboardWidget: PcManagerWidget,
  icon: faDesktop,
};
