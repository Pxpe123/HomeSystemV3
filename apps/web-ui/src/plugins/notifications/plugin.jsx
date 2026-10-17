import { lazyApp } from "../../application/lazyApp";
import { faBell } from "@fortawesome/free-solid-svg-icons";
const NotificationsApp = lazyApp(() => import("./ui/NotificationsApp"));
export default { Page: NotificationsApp, icon: faBell };
