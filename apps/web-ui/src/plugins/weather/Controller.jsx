import { useEffect } from "react";
import { weatherService } from "./weather";
export function WeatherController() {
  useEffect(() => {
    weatherService.start();
    return () => weatherService.stop();
  }, []);
  return null;
}
