import { lazyApp } from "../../application/lazyApp";
import { faHouse } from "@fortawesome/free-solid-svg-icons";
const SmartHomeApp = lazyApp(() => import("./ui/SmartHomeApp"));
import SmartHomeWidget from "./ui/SmartHomeWidget";
export default {
  Page: SmartHomeApp,
  DashboardWidget: SmartHomeWidget,
  icon: faHouse,
};
