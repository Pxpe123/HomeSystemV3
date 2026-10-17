import { useEffect } from "react";
import { music } from "./music";
import { useProfile } from "../../context/ProfileContext";
import { useWebSocket } from "../../context/WebSocketContext";
import { runtime } from "../../application/services";

export function MusicController() {
  const { currentProfile, fetchProfiles } = useProfile();
  const { spotifyLoginResult, clearSpotifyLoginResult, connected } =
    useWebSocket();
  const profileId = currentProfile?.id;
  const linkedId = currentProfile?.spotifyProfileId;
  useEffect(() => {
    music.setUser(profileId ? linkedId || null : null);
  }, [profileId, linkedId]);
  useEffect(() => {
    if (!connected || !profileId) return;
    const interval = setInterval(() => {
      fetchProfiles().catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [connected, profileId, fetchProfiles]);
  useEffect(() => {
    if (!spotifyLoginResult?.userId) return;
    // OAuth was already bound and saved by the server, never by the current browser selection.
    if (spotifyLoginResult.profileId === profileId) {
      fetchProfiles().catch(() =>
        runtime.notify({
          title: "Spotify link saved",
          message: "Reconnect to reload your profile.",
          appId: "spotify",
          tone: "warning",
        }),
      );
      runtime.notify({
        title: "Spotify connected",
        message: "Your account link is saved on the home server.",
        appId: "spotify",
        tone: "success",
      });
    }
    clearSpotifyLoginResult();
  }, [spotifyLoginResult, profileId, fetchProfiles, clearSpotifyLoginResult]);
  useEffect(() => () => music.stop(), []);
  return null;
}
