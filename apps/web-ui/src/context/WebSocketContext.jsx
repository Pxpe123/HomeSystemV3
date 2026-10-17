import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { server } from "../application/services";
import { useConnection } from "../application/useHome";

const Context = createContext(null);
/** Transport-only provider. App polling must live in the package lifecycle. */
export function WebSocketProvider({ children }) {
  const { status } = useConnection();
  const [spotifyLoginResult, setSpotifyLoginResult] = useState(null);
  useEffect(() => {
    const off = server.on("Spotify/LoginResult", (event) =>
      setSpotifyLoginResult({
        displayName: event.DisplayName ?? event.displayName,
        userId: event.UserId ?? event.userId,
        profileId: event.ProfileId ?? event.profileId,
      }),
    );
    server.connect();
    return () => {
      off();
      server.stop();
    };
  }, []);
  const clearSpotifyLoginResult = useCallback(
    () => setSpotifyLoginResult(null),
    [],
  );
  const value = useMemo(
    () => ({
      connected: status === "online",
      serverUrl: server.url,
      request: server.request,
      spotifyLoginResult,
      clearSpotifyLoginResult,
    }),
    [status, spotifyLoginResult, clearSpotifyLoginResult],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useWebSocket() {
  const value = useContext(Context);
  if (!value) throw new Error("useWebSocket requires WebSocketProvider");
  return value;
}
