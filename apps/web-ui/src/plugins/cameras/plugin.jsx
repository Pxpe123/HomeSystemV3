import { lazyApp } from "../../application/lazyApp";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
const CamerasApp = lazyApp(() => import("./ui/CamerasApp"));
export default { Page: CamerasApp, icon: faCamera };
