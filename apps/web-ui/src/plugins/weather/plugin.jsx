import { lazyApp } from "../../application/lazyApp";
/* eslint-disable react-refresh/only-export-components -- Package descriptor includes dashboard components. */
import { faCloudSun } from "@fortawesome/free-solid-svg-icons";
const WeatherApp = lazyApp(() => import("./ui/WeatherApp"));
import WeatherWidget from "./ui/WeatherWidget";
import { useWeather } from "./useWeather";
import { WeatherController } from "./Controller";
function DashboardWidget() {
  const { weather, forecast, location, connected, nextRefreshIn } =
    useWeather();
  return (
    <WeatherWidget
      weather={weather}
      forecast={forecast}
      city={location.city}
      connected={connected}
      nextRefreshIn={nextRefreshIn}
    />
  );
}
export default {
  Page: WeatherApp,
  DashboardWidget,
  Controller: WeatherController,
  icon: faCloudSun,
};
