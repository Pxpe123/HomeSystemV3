/*
 * SpotifyApp - Spotify-clone music player
 * 3-panel layout: sidebar (playlists), main (now playing / playlist / search), bottom player bar
 */

import { useSpotifyApp } from "../useSpotifyApp";
import { serverImage } from "../../../core/ServerMedia";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPause,
  faForwardStep,
  faBackwardStep,
  faVolumeHigh,
  faVolumeLow,
  faVolumeXmark,
  faMusic,
  faCompactDisc,
  faLink,
  faListUl,
  faLaptop,
  faMobileScreen,
  faDesktop,
  faShuffle,
  faRepeat,
  faMagnifyingGlass,
  faXmark,
  faCheck,
  faCirclePlay,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { AppTopBar } from "../../../app/Apps/components";
import "../../../app/Apps/AppPage.css";
import "./SpotifyApp.css";

export default function SpotifyApp() {
  const {
    isLinked,
    linkQr,
    player,
    isPlaying,
    localProgress,
    duration,
    shuffle,
    repeat,
    playlists,
    queue,
    devices,
    activePlaylistId,
    activeView,
    setActiveView,
    viewPlaylist,
    playlistTracks,
    playlistLoading,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    showDeviceMenu,
    setShowDeviceMenu,
    deviceMenuRef,
    openPlaylist,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleShuffle,
    handleRepeat,
    handleTransferDevice,
    handlePlayTrack,
    handlePlayPlaylistContext,
    handleLinkSpotify,
  } = useSpotifyApp();

  // ── Helpers ──
  const formatTime = (ms) => {
    if (!ms || ms < 0) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (localProgress / duration) * 100 : 0;

  const getDeviceIcon = (type) => {
    if (!type) return faLaptop;
    const t = type.toLowerCase();
    if (t.includes("phone") || t.includes("mobile") || t.includes("smartphone"))
      return faMobileScreen;
    if (t.includes("speaker")) return faDesktop;
    return faLaptop;
  };

  // ── Not linked view ──
  if (!isLinked) {
    return (
      <div className="app-page spotify-app">
        <AppTopBar
          title="Spotify"
          description="Music, playlists and speakers around your home."
        />
        <div className="spotify-connect">
          <div className="spotify-connect-card">
            <FontAwesomeIcon
              icon={faSpotify}
              className="spotify-connect-logo"
            />
            <h2>Connect to Spotify</h2>
            <p>Link your Spotify account to control playback</p>
            {serverImage(linkQr) ? (
              <div className="spotify-qr-container">
                <img
                  src={serverImage(linkQr)}
                  alt="Spotify QR Code"
                  className="spotify-qr"
                />
                <p>Scan with your phone to link</p>
              </div>
            ) : (
              <button className="spotify-link-btn" onClick={handleLinkSpotify}>
                <FontAwesomeIcon icon={faLink} />
                <span>Link Spotify Account</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeDevice = devices.find((d) => d.isActive);

  // ── Render main content based on activeView ──
  const renderMainContent = () => {
    // Search view
    if (activeView === "search") {
      return (
        <div className="spotify-search-view">
          <div className="search-bar">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
            <input
              type="text"
              placeholder="What do you want to play?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery("")}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
          {searchLoading && <div className="search-loading">Searching...</div>}
          {!searchLoading && searchResults.length > 0 && (
            <div className="track-list">
              {searchResults.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  className="track-item"
                  onClick={() => handlePlayTrack(track.uri)}
                >
                  <span className="track-index">{i + 1}</span>
                  <div className="track-item-art">
                    {serverImage(track.imageUrl) ? (
                      <img src={serverImage(track.imageUrl)} alt="" />
                    ) : (
                      <div className="track-item-art-placeholder">
                        <FontAwesomeIcon icon={faMusic} />
                      </div>
                    )}
                  </div>
                  <div className="track-item-info">
                    <span className="track-item-title">{track.name}</span>
                    <span className="track-item-artist">
                      {track.artistName}
                    </span>
                  </div>
                  <span className="track-item-duration">
                    {formatTime(track.durationMs)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!searchLoading && searchQuery && searchResults.length === 0 && (
            <div className="search-empty">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      );
    }

    // Playlist view
    if (activeView === "playlist" && viewPlaylist) {
      return (
        <div className="spotify-playlist-view">
          <div className="playlist-view-header">
            <button
              className="playlist-back-btn"
              onClick={() => setActiveView("nowPlaying")}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <div className="playlist-view-info">
              <span className="playlist-view-label">PLAYLIST</span>
              <h2 className="playlist-view-title">{viewPlaylist.name}</h2>
            </div>
            <button
              className="playlist-play-all-btn"
              onClick={() => handlePlayPlaylistContext(viewPlaylist.id)}
            >
              <FontAwesomeIcon icon={faCirclePlay} />
            </button>
          </div>
          {playlistLoading && (
            <div className="search-loading">Loading tracks...</div>
          )}
          {!playlistLoading && playlistTracks.length > 0 && (
            <div className="track-list">
              {playlistTracks.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  className={`track-item ${player?.songId === track.id ? "playing" : ""}`}
                  onClick={() => handlePlayTrack(track.uri)}
                >
                  <span className="track-index">
                    {player?.songId === track.id ? (
                      <FontAwesomeIcon
                        icon={faMusic}
                        className="track-playing-icon"
                      />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="track-item-art">
                    {serverImage(track.imageUrl) ? (
                      <img src={serverImage(track.imageUrl)} alt="" />
                    ) : (
                      <div className="track-item-art-placeholder">
                        <FontAwesomeIcon icon={faMusic} />
                      </div>
                    )}
                  </div>
                  <div className="track-item-info">
                    <span className="track-item-title">{track.name}</span>
                    <span className="track-item-artist">
                      {track.artistName}
                    </span>
                  </div>
                  <span className="track-item-duration">
                    {formatTime(track.durationMs)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Now Playing view (default)
    return (
      <>
        {/* Now Playing Hero */}
        <div className="now-playing-hero">
          <div className="now-playing-art">
            {serverImage(player?.songImage) ? (
              <img src={serverImage(player.songImage)} alt="Album Art" />
            ) : (
              <div className="now-playing-art-placeholder">
                <FontAwesomeIcon icon={faCompactDisc} />
              </div>
            )}
          </div>
          <div className="now-playing-info">
            <h1 className="now-playing-title">
              {player?.songName || "Nothing Playing"}
            </h1>
            <p className="now-playing-artist">
              {player?.artistName || "Play something on Spotify"}
            </p>
            {activeDevice && (
              <div className="now-playing-device">
                <FontAwesomeIcon icon={getDeviceIcon(activeDevice.type)} />
                <span>Listening on {activeDevice.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="queue-section">
            <h3 className="queue-header">Next in Queue</h3>
            <div className="track-list">
              {queue.slice(0, 15).map((track, i) => (
                <div
                  key={`${track.songId}-${i}`}
                  className="track-item"
                  onClick={() =>
                    handlePlayTrack(`spotify:track:${track.songId}`)
                  }
                >
                  <span className="track-index">{i + 1}</span>
                  <div className="track-item-art">
                    {serverImage(track.songImage) ? (
                      <img src={serverImage(track.songImage)} alt="" />
                    ) : (
                      <div className="track-item-art-placeholder">
                        <FontAwesomeIcon icon={faMusic} />
                      </div>
                    )}
                  </div>
                  <div className="track-item-info">
                    <span className="track-item-title">{track.songName}</span>
                    <span className="track-item-artist">
                      {track.artistName}
                    </span>
                  </div>
                  <span className="track-item-duration">
                    {formatTime(track.durationMs)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Main player view ──
  return (
    <div className="app-page spotify-app">
      <AppTopBar
        title="Spotify"
        description="Music, playlists and speakers around your home."
      />

      <div className="spotify-layout">
        {/* ── Sidebar ── */}
        <aside className="spotify-sidebar">
          <div className="sidebar-header">
            <FontAwesomeIcon icon={faListUl} />
            <span>Your Library</span>
          </div>

          {/* Now Playing link */}
          <div
            className={`sidebar-nav-item ${activeView === "nowPlaying" ? "active" : ""}`}
            onClick={() => setActiveView("nowPlaying")}
          >
            <FontAwesomeIcon icon={faMusic} />
            <span>Now Playing</span>
          </div>

          {/* Search link */}
          <div
            className={`sidebar-nav-item ${activeView === "search" ? "active" : ""}`}
            onClick={() => setActiveView("search")}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span>Search</span>
          </div>

          <div className="sidebar-divider" />

          <div className="playlist-list">
            {playlists.length === 0 && (
              <div className="playlist-empty">No playlists found</div>
            )}
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className={`playlist-item ${activePlaylistId === pl.id ? "active" : ""} ${activeView === "playlist" && viewPlaylist?.id === pl.id ? "viewing" : ""}`}
                onClick={() => openPlaylist(pl)}
              >
                <FontAwesomeIcon icon={faMusic} className="playlist-icon" />
                <span className="playlist-name">{pl.name}</span>
                {activePlaylistId === pl.id && (
                  <span className="playlist-playing-indicator" />
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="spotify-main">{renderMainContent()}</main>
      </div>

      {/* ── Bottom Player Bar ── */}
      <div className="spotify-player-bar">
        {/* Left: track info */}
        <div className="player-left">
          <div className="player-thumb">
            {serverImage(player?.songImage) ? (
              <img src={serverImage(player.songImage)} alt="" />
            ) : (
              <div className="player-thumb-placeholder">
                <FontAwesomeIcon icon={faMusic} />
              </div>
            )}
          </div>
          <div className="player-track-info">
            <span className="player-track-name">{player?.songName || "—"}</span>
            <span className="player-track-artist">
              {player?.artistName || ""}
            </span>
          </div>
        </div>

        {/* Center: controls + progress */}
        <div className="player-center">
          <div className="player-controls">
            <button
              className={`player-btn player-btn-sm ${shuffle ? "active" : ""}`}
              onClick={handleShuffle}
              aria-label="Shuffle"
              aria-pressed={shuffle}
            >
              <FontAwesomeIcon icon={faShuffle} />
            </button>
            <button
              className="player-btn"
              onClick={handlePrevious}
              aria-label="Previous track"
            >
              <FontAwesomeIcon icon={faBackwardStep} />
            </button>
            <button
              className="player-btn play-btn"
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause playback" : "Play playback"}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>
            <button
              className="player-btn"
              onClick={handleNext}
              aria-label="Next track"
            >
              <FontAwesomeIcon icon={faForwardStep} />
            </button>
            <button
              className={`player-btn player-btn-sm ${repeat !== "off" ? "active" : ""}`}
              onClick={handleRepeat}
              aria-label={`Repeat: ${repeat}`}
            >
              <FontAwesomeIcon icon={faRepeat} />
              {repeat === "track" && <span className="repeat-badge">1</span>}
            </button>
          </div>
          <div className="player-progress">
            <span className="player-time">{formatTime(localProgress)}</span>
            <div className="player-progress-bar">
              <div
                className="player-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="player-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: volume + device */}
        <div className="player-right">
          <div className="player-device-wrapper" ref={deviceMenuRef}>
            <button
              className={`player-device-btn ${showDeviceMenu ? "open" : ""}`}
              onClick={() => setShowDeviceMenu(!showDeviceMenu)}
            >
              <FontAwesomeIcon icon={getDeviceIcon(activeDevice?.type)} />
              <span>{activeDevice?.name || "No device"}</span>
            </button>

            {showDeviceMenu && (
              <div className="device-menu">
                <div className="device-menu-header">Select a device</div>
                {devices.length === 0 && (
                  <div className="device-menu-empty">No devices available</div>
                )}
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className={`device-menu-item ${d.isActive ? "active" : ""}`}
                    onClick={() => handleTransferDevice(d.id)}
                  >
                    <FontAwesomeIcon icon={getDeviceIcon(d.type)} />
                    <div className="device-menu-item-info">
                      <span className="device-menu-item-name">{d.name}</span>
                      <span className="device-menu-item-type">{d.type}</span>
                    </div>
                    {d.isActive && (
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="device-active-check"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="player-volume">
            <FontAwesomeIcon
              icon={
                !activeDevice || activeDevice.volumePercent === 0
                  ? faVolumeXmark
                  : activeDevice.volumePercent < 50
                    ? faVolumeLow
                    : faVolumeHigh
              }
            />
            <div className="player-volume-bar">
              <div
                className="player-volume-fill"
                style={{ width: `${activeDevice?.volumePercent ?? 50}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
