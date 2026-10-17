import { WeatherService } from "./WeatherService";
import { server, runtime } from "../../application/services";
export const weatherService = new WeatherService(server, {
  onData(data) {
    runtime.setGlobal("location", data.location);
    runtime.setGlobal("sunTimes", data.sunTimes);
  },
});
