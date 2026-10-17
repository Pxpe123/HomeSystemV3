import { ObservableStore } from "../../core/ObservableStore.js";

/** Weather polling belongs to the installed package, not the transport provider. */
export class WeatherService extends ObservableStore {
  constructor(
    client,
    {
      now = () => Date.now(),
      schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
      cancel = (timer) => globalThis.clearTimeout(timer),
      onData = () => {},
    } = {},
  ) {
    super({
      weather: null,
      forecast: [],
      sunTimes: null,
      location: { city: "Liverpool" },
      refreshAt: 0,
      weatherError: null,
    });
    Object.assign(this, { client, now, schedule, cancel, onData });
    this.generation = 0;
    this.timer = null;
    this.started = false;
    this.pending = false;
    this.cleanup = [];
  }
  start() {
    if (this.started) return;
    this.started = true;
    this.cleanup = [
      this.client.on("connected", this.refresh),
      this.client.on("weatherUpdate", (event) => this.accept(event.data || {})),
    ];
    this.refresh();
  }
  stop() {
    this.started = false;
    this.generation++;
    this.pending = false;
    this.cleanup.forEach((off) => off());
    this.cleanup = [];
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
  }
  next(seconds) {
    if (this.timer !== null) this.cancel(this.timer);
    const delay = Math.max(30, Number(seconds) || 180);
    this.update({ refreshAt: this.now() + delay * 1000 });
    if (this.started) this.timer = this.schedule(this.refresh, delay * 1000);
  }
  accept(data, forecast = this.state.forecast) {
    if (!this.started) return;
    this.update({
      weather: data.weather ?? this.state.weather,
      sunTimes: data.sunTimes || this.state.sunTimes,
      location: data.location || this.state.location,
      forecast,
      weatherError:
        data.weather || this.state.weather
          ? null
          : "Weather is not configured on the home server.",
    });
    this.onData(this.state);
    this.next(data.secondsUntilRefresh);
  }
  refresh = async () => {
    if (!this.started || this.pending) return;
    if (this.client.getSnapshot().status !== "online") {
      this.next(30);
      return;
    }
    const generation = this.generation;
    this.pending = true;
    try {
      const [current, forecast] = await Promise.all([
        this.client.request("Weather/GetWeather"),
        this.client.request("Weather/GetForecast"),
      ]);
      if (this.started && generation === this.generation)
        this.accept(
          current.data || {},
          Array.isArray(forecast.data) ? forecast.data : [],
        );
    } catch (error) {
      if (this.started && generation === this.generation) {
        this.update({ weatherError: error.message });
        this.next(30);
      }
    } finally {
      if (generation === this.generation) this.pending = false;
    }
  };
}
