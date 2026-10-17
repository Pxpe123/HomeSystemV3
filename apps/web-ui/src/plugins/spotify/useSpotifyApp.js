import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { music } from "./music";
import { server, runtime } from "../../application/services";
import { useClock } from "../../shared/hooks/useClock";

/** View adapter for the original Spotify UI. MusicService owns background work. */
export function useSpotifyApp() {
  const state = useSyncExternalStore(music.subscribe, music.getSnapshot);
  const now = useClock();
  const [linkQr, setLinkQr] = useState(null);
  const [activeView, setActiveView] = useState("nowPlaying");
  const [viewPlaylist, setViewPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const deviceMenuRef = useRef(null);
  const playlistGeneration = useRef(0);

  function report(error) {
    runtime.notify({
      title: "Spotify needs attention",
      message: error.message,
      appId: "spotify",
      tone: "warning",
    });
  }
  function command(action, values) {
    music.command(action, values).catch(report);
  }

  useEffect(() => {
    let cancelled = false;
    if (!searchQuery.trim() || !state.userId) return;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const result = await server.request("Spotify/Search", {
          userId: state.userId,
          query: searchQuery.trim(),
        });
        if (!cancelled) setSearchResults(result.data?.tracks || []);
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          report(error);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, state.userId]);

  useEffect(() => {
    if (!showDeviceMenu) return;
    const outside = (event) => {
      if (!deviceMenuRef.current?.contains(event.target))
        setShowDeviceMenu(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") setShowDeviceMenu(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [showDeviceMenu]);
  useEffect(
    () => () => {
      playlistGeneration.current++;
    },
    [],
  );

  async function handleLinkSpotify() {
    try {
      const result = await server.request("Spotify/Login");
      setLinkQr(result.data?.qrCode || null);
    } catch (error) {
      report(error);
    }
  }
  async function openPlaylist(playlist) {
    const generation = ++playlistGeneration.current;
    setViewPlaylist(playlist);
    setActiveView("playlist");
    setPlaylistLoading(true);
    setPlaylistTracks([]);
    try {
      const result = await server.request("Spotify/GetPlaylistTracks", {
        userId: state.userId,
        playlistId: playlist.id,
      });
      if (generation === playlistGeneration.current)
        setPlaylistTracks(result.data?.tracks || []);
    } catch (error) {
      if (generation === playlistGeneration.current) report(error);
    } finally {
      if (generation === playlistGeneration.current) setPlaylistLoading(false);
    }
  }
  const player = state.playback;
  const duration = player?.durationMs || 0;
  const progress =
    (player?.progressMs || 0) +
    (player?.playbackState ? Math.max(0, now - (state.updatedAt || now)) : 0);
  return {
    clockStr: new Date(now).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isLinked: !!state.userId,
    linkQr,
    player,
    isPlaying: player?.playbackState || false,
    localProgress: Math.min(progress, duration),
    duration,
    shuffle: player?.shuffleState || false,
    repeat: player?.repeatState || "off",
    playlists: state.playlists || [],
    queue: player?.queue || [],
    devices: state.devices || [],
    activePlaylistId: state.activePlaylistId,
    activeView,
    setActiveView,
    viewPlaylist,
    playlistTracks,
    playlistLoading,
    searchQuery,
    setSearchQuery: (value) => {
      setSearchQuery(value);
      setSearchResults([]);
      setSearchLoading(!!value.trim());
    },
    searchResults: searchQuery.trim() ? searchResults : [],
    searchLoading: !!searchQuery.trim() && searchLoading,
    showDeviceMenu,
    setShowDeviceMenu,
    deviceMenuRef,
    openPlaylist,
    handleLinkSpotify,
    handlePlayPause: () => command(player?.playbackState ? "pause" : "play"),
    handleNext: () => command("next"),
    handlePrevious: () => command("previous"),
    handleShuffle: () => command("shuffle", { value: !player?.shuffleState }),
    handleRepeat: () =>
      command("repeat", {
        state:
          player?.repeatState === "off"
            ? "context"
            : player?.repeatState === "context"
              ? "track"
              : "off",
      }),
    handleTransferDevice: (deviceId) => {
      setShowDeviceMenu(false);
      command("transfer", { deviceId });
    },
    handlePlayTrack: (uri) => command("playuri", { uri }),
    handlePlayPlaylistContext: (playlistId) =>
      command("playcontext", { contextUri: `spotify:playlist:${playlistId}` }),
  };
}
