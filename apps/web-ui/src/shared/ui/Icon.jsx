import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faCloudSun,
  faMusic,
  faClock,
  faBell,
  faGear,
  faDesktop,
  faWaveSquare,
  faArrowRight,
  faArrowLeft,
  faPlay,
  faPause,
  faXmark,
  faPlus,
  faMagnifyingGlass,
  faCircleCheck,
  faTriangleExclamation,
  faRotateRight,
  faSun,
  faMoon,
  faLayerGroup,
  faCircle,
  faVolumeHigh,
  faStop,
  faCamera,
} from "@fortawesome/free-solid-svg-icons";
const icons = {
  home: faHouse,
  weather: faCloudSun,
  music: faMusic,
  timer: faClock,
  bell: faBell,
  settings: faGear,
  computer: faDesktop,
  activity: faWaveSquare,
  arrow: faArrowRight,
  back: faArrowLeft,
  play: faPlay,
  pause: faPause,
  close: faXmark,
  plus: faPlus,
  search: faMagnifyingGlass,
  success: faCircleCheck,
  warning: faTriangleExclamation,
  retry: faRotateRight,
  sun: faSun,
  moon: faMoon,
  apps: faLayerGroup,
  dot: faCircle,
  volume: faVolumeHigh,
  stop: faStop,
  camera: faCamera,
};
export function Icon({ name, ...props }) {
  return (
    <FontAwesomeIcon
      icon={icons[name] || faLayerGroup}
      aria-hidden="true"
      {...props}
    />
  );
}
