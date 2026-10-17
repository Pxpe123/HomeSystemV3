import { useEffect } from "react";
import { music } from "./music";
import { useProfile } from "../../context/ProfileContext";
import { useWebSocket } from "../../context/WebSocketContext";
import { server, runtime } from "../../application/services";

export function MusicController() {
  const { currentProfile } = useProfile();
  const profileId = currentProfile?.id;
  const linkedId = currentProfile?.spotifyProfileId;
  const { spotifyLoginResult, clearSpotifyLoginResult } = useWebSocket();
  useEffect(() => {
    const cachedLink =
      runtime.getSnapshot().appData.spotify?.profileLinks?.[profileId];
    music.setUser(profileId ? linkedId || cachedLink || null : null);
  }, [profileId, linkedId]);
  useEffect(() => {
    if (!spotifyLoginResult?.userId || !currentProfile?.id) return;
    const id = spotifyLoginResult.userId;
    music.setUser(id);
    const links = runtime.getSnapshot().appData.spotify?.profileLinks || {};
    runtime.setAppState("spotify", {
      profileLinks: { ...links, [currentProfile.id]: id },
    });
    if (currentProfile?.id)
      server
        .request("Profile/LinkSpotify", {
          profileId: currentProfile.id,
          spotifyProfileId: id,
        })
        .catch((error) =>
          runtime.notify({
            title: "Profile link was not saved",
            message: error.message,
            appId: "spotify",
            tone: "warning",
          }),
        );
    runtime.notify({
      title: "Spotify connected",
      message: "Your music is ready on this display.",
      appId: "spotify",
      tone: "success",
    });
    clearSpotifyLoginResult();
  }, [spotifyLoginResult, currentProfile?.id, clearSpotifyLoginResult]);
  useEffect(() => () => music.stop(), []);
  return null;
}
