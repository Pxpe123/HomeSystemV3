import { useSyncExternalStore } from "react";
import { weatherService } from "./weather";
import { useClock } from "../../shared/hooks/useClock";
import { useConnection } from "../../application/useHome";
export function useWeather() {
  const data = useSyncExternalStore(
    weatherService.subscribe,
    weatherService.getSnapshot,
  );
  const now = useClock();
  const { status } = useConnection();
  return {
    ...data,
    connected: status === "online",
    nextRefreshIn: Math.max(0, Math.ceil((data.refreshAt - now) / 1000)),
    refresh: weatherService.refresh,
  };
}
