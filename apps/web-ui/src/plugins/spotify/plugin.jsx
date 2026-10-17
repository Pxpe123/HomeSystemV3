import { lazyApp } from "../../application/lazyApp";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";
const SpotifyApp = lazyApp(() => import("./ui/SpotifyApp"));
import { MusicController } from "./Controller";
import { SpotifyWidget } from "./ActiveWidget";
import { music } from "./music";
const Callback = lazyApp(() => import("../../callbacks/Spotify/Success"));
export default {
  Callback,
  Page: SpotifyApp,
  Controller: MusicController,
  icon: faSpotify,
  getActiveWidgets(snapshot, { online }) {
    const player = snapshot.sessions.spotify;
    return ["running", "paused"].includes(player?.status)
      ? [
          {
            id: "spotify",
            name: "Spotify",
            Component: SpotifyWidget,
            props: { player, online },
          },
        ]
      : [];
  },
  onUninstall() {
    music.setUser(null);
    music.stop();
  },
};
