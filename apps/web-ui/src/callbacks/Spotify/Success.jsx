import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import "./Success.css";

export default function SpotifySuccess() {
  return (
    <div className="spotify-callback">
      <div className="spotify-callback-card">
        {/* Header */}
        <div className="spotify-callback-header">
          <FontAwesomeIcon icon={faSpotify} className="spotify-icon" />
          <h1 className="header-title">Spotify</h1>
        </div>

        {/* Success Content */}
        <div className="spotify-callback-content">
          <div className="success-icon-wrapper">
            <FontAwesomeIcon icon={faSpotify} className="success-icon" />
          </div>

          <h2 className="success-title">Check your home display</h2>
          <p className="success-subtitle">
            Spotify connections are confirmed on the phone that completes the
            link. This legacy address does not verify a connection.
          </p>

          {/* Close Message */}
          <div className="close-message">
            <FontAwesomeIcon icon={faInfoCircle} className="close-icon" />
            <span>You can now close this window and return to the app</span>
          </div>
        </div>
      </div>
    </div>
  );
}
