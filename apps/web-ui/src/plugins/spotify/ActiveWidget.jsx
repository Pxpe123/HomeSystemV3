import { Link } from "react-router-dom";
import { runtime } from "../../application/services";
import { Icon } from "../../shared/ui/Icon";
import { music } from "./music";
import { serverImage } from "../../core/ServerMedia";
export function SpotifyWidget({ player, online }) {
  async function command(action) {
    try {
      await music.command(action);
    } catch (error) {
      runtime.notify({
        title: "Spotify needs attention",
        message: error.message,
        appId: "spotify",
        tone: "warning",
      });
    }
  }
  return (
    <article className="hs-spotify-widget">
      <header>
        <span>
          <Icon name="music" /> SPOTIFY
        </span>
        <Link to="/app/spotify">
          Open player <Icon name="arrow" />
        </Link>
      </header>
      <div className="hs-now-playing">
        {serverImage(player.image) ? (
          <img src={serverImage(player.image)} alt="" draggable="false" />
        ) : (
          <div className="hs-album-placeholder">
            <Icon name="music" />
          </div>
        )}
        <div>
          <strong>{player.summary || "Spotify"}</strong>
          <p>{player.subtitle}</p>
          <small>
            {!online
              ? "Offline · Last known playback"
              : player.status === "running"
                ? "Now playing"
                : "Paused"}
          </small>
        </div>
      </div>
      <div className="hs-transport">
        <button
          disabled={!online}
          aria-label="Previous Spotify track"
          onClick={() => command("previous")}
        >
          <Icon name="back" />
        </button>
        <button
          className="hs-play-control"
          disabled={!online}
          aria-label={
            player.status === "running" ? "Pause Spotify" : "Resume Spotify"
          }
          onClick={() =>
            command(player.status === "running" ? "pause" : "play")
          }
        >
          <Icon name={player.status === "running" ? "pause" : "play"} />
        </button>
        <button
          disabled={!online}
          aria-label="Next Spotify track"
          onClick={() => command("next")}
        >
          <Icon name="arrow" />
        </button>
      </div>
    </article>
  );
}
