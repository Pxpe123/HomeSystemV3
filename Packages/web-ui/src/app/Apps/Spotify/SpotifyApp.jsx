/*
 * SpotifyApp - Spotify-clone music player
 * 3-panel layout: sidebar (playlists), main (now playing / playlist / search), bottom player bar
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
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
  faChevronLeft
} from '@fortawesome/free-solid-svg-icons'
import { faSpotify } from '@fortawesome/free-brands-svg-icons'
import { useNavigate } from 'react-router-dom'
import { useWebSocket, useProfile } from '../../../context'
import '../AppPage.css'
import './SpotifyApp.css'

const POLL_INTERVAL = 2000
const SEARCH_DEBOUNCE = 500
const PROGRESS_TICK = 250

export default function SpotifyApp() {
  const { request, spotifyLoginResult, clearSpotifyLoginResult } = useWebSocket()
  const { currentProfile } = useProfile()
  const navigate = useNavigate()

  // Clock
  const [clock, setClock] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])
  const clockStr = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  // Connection state
  const [isLinked, setIsLinked] = useState(false)
  const [spotifyUserId, setSpotifyUserId] = useState(null)
  const [linkQr, setLinkQr] = useState(null)

  // Playback state
  const [player, setPlayer] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [localProgress, setLocalProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState('off')

  // Library state
  const [playlists, setPlaylists] = useState([])
  const [queue, setQueue] = useState([])
  const [devices, setDevices] = useState([])
  const [activePlaylistId, setActivePlaylistId] = useState(null)

  // View state
  const [activeView, setActiveView] = useState('nowPlaying')
  const [viewPlaylist, setViewPlaylist] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const [playlistLoading, setPlaylistLoading] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Device menu
  const [showDeviceMenu, setShowDeviceMenu] = useState(false)

  // Refs
  const pollRef = useRef(null)
  const progressRef = useRef(null)
  const isPlayingRef = useRef(false)
  const searchTimerRef = useRef(null)
  const deviceMenuRef = useRef(null)

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // ── Spotify link check ──
  useEffect(() => {
    checkSpotifyLink()
  }, [currentProfile])

  // Handle login result push from server
  useEffect(() => {
    if (spotifyLoginResult && currentProfile) {
      handleSpotifyLinked(spotifyLoginResult.userId)
      clearSpotifyLoginResult()
    }
  }, [spotifyLoginResult, currentProfile])

  // Close device menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(e.target)) {
        setShowDeviceMenu(false)
      }
    }
    if (showDeviceMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDeviceMenu])

  const handleSpotifyLinked = async (userId) => {
    try {
      const result = await request('Profile/LinkSpotify', {
        profileId: currentProfile.id,
        spotifyProfileId: userId
      })
      if (result?.success || result?.data?.success) {
        setSpotifyUserId(userId)
        setIsLinked(true)
        setLinkQr(null)
        fetchState(userId)
      }
    } catch (err) {
      console.error('[Spotify] Failed to link:', err)
    }
  }

  const checkSpotifyLink = async () => {
    if (currentProfile?.spotifyProfileId) {
      setSpotifyUserId(currentProfile.spotifyProfileId)
      setIsLinked(true)
      fetchState(currentProfile.spotifyProfileId)
      return
    }
    // No Spotify linked for this user — they need to link via the login flow
    setIsLinked(false)
  }

  // ── State fetching ──
  const fetchState = useCallback(async (userId) => {
    if (!userId) return
    try {
      const response = await request('Spotify/GetState', { userId })
      const data = response?.data
      if (!data) return

      const playback = data.playback
      if (playback) {
        setPlayer(playback)
        setIsPlaying(playback.playbackState ?? false)
        setLocalProgress(playback.progressMs ?? 0)
        setDuration(playback.durationMs ?? 0)
        setQueue(playback.queue ?? [])
        setShuffle(playback.shuffleState ?? false)
        setRepeat(playback.repeatState ?? 'off')
      } else {
        // No playback data yet - keep polling, will pick up when user starts playing
        setIsPlaying(false)
      }
      if (data.playlists) setPlaylists(data.playlists)
      if (data.devices) setDevices(data.devices)
      setActivePlaylistId(data.activePlaylistId ?? null)
    } catch {
      // silent
    }
  }, [request])

  // ── Polling ──
  useEffect(() => {
    if (!isLinked || !spotifyUserId) return
    fetchState(spotifyUserId)
    pollRef.current = setInterval(() => fetchState(spotifyUserId), POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [isLinked, spotifyUserId, fetchState])

  // ── Local progress ticker (250ms for smooth bar) ──
  useEffect(() => {
    progressRef.current = setInterval(() => {
      if (isPlayingRef.current) {
        setLocalProgress(prev => {
          const next = prev + PROGRESS_TICK
          return next > duration ? duration : next
        })
      }
    }, PROGRESS_TICK)
    return () => clearInterval(progressRef.current)
  }, [duration])

  // ── Search debounce ──
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await request('Spotify/Search', {
          userId: spotifyUserId,
          query: searchQuery.trim()
        })
        setSearchResults(response?.data?.tracks ?? [])
      } catch {
        setSearchResults([])
      }
      setSearchLoading(false)
    }, SEARCH_DEBOUNCE)
    return () => clearTimeout(searchTimerRef.current)
  }, [searchQuery, spotifyUserId, request])

  // Refetch state shortly after a playback action so UI catches up fast
  const refetchSoon = useCallback(() => {
    setTimeout(() => { if (spotifyUserId) fetchState(spotifyUserId) }, 600)
  }, [fetchState, spotifyUserId])

  // ── Playback controls (optimistic, fire-and-forget) ──
  const handlePlayPause = () => {
    if (!spotifyUserId) return
    const newState = !isPlaying
    setIsPlaying(newState)
    request('Spotify/Playback', {
      userId: spotifyUserId,
      action: newState ? 'play' : 'pause'
    }).catch(() => {})
    refetchSoon()
  }

  const handleNext = () => {
    if (!spotifyUserId) return
    request('Spotify/Playback', { userId: spotifyUserId, action: 'next' }).catch(() => {})
    refetchSoon()
  }

  const handlePrevious = () => {
    if (!spotifyUserId) return
    request('Spotify/Playback', { userId: spotifyUserId, action: 'previous' }).catch(() => {})
    refetchSoon()
  }

  const handleShuffle = () => {
    if (!spotifyUserId) return
    const newVal = !shuffle
    setShuffle(newVal)
    request('Spotify/Playback', {
      userId: spotifyUserId,
      action: 'shuffle',
      value: newVal
    }).catch(() => {})
    refetchSoon()
  }

  const handleRepeat = () => {
    if (!spotifyUserId) return
    const next = repeat === 'off' ? 'context' : repeat === 'context' ? 'track' : 'off'
    setRepeat(next)
    request('Spotify/Playback', {
      userId: spotifyUserId,
      action: 'repeat',
      state: next
    }).catch(() => {})
    refetchSoon()
  }

  const handleTransferDevice = (deviceId) => {
    if (!spotifyUserId) return
    setShowDeviceMenu(false)
    request('Spotify/Playback', {
      userId: spotifyUserId,
      action: 'transfer',
      deviceId
    }).catch(() => {})
    refetchSoon()
  }

  const handlePlayTrack = (uri) => {
    if (!spotifyUserId || !uri) return
    setIsPlaying(true)
    request('Spotify/Playback', {
      userId: spotifyUserId,
      action: 'playuri',
      uri
    }).catch(() => {})
    refetchSoon()
  }

  const handlePlayPlaylistContext = (playlistId) => {
    if (!spotifyUserId || !playlistId) return
    setIsPlaying(true)
    request('Spotify/Playback', {
      userId: spotifyUserId,
      action: 'playcontext',
      contextUri: `spotify:playlist:${playlistId}`
    }).catch(() => {})
    refetchSoon()
  }

  const handleLinkSpotify = async () => {
    try {
      const response = await request('Spotify/Login', {})
      const qrCode = response.data?.qrCode || response.data?.QrCode
      if (qrCode) setLinkQr(qrCode)
    } catch (err) {
      console.error('Failed to get Spotify QR:', err)
    }
  }

  // ── Playlist view ──
  const openPlaylist = async (playlist) => {
    setViewPlaylist(playlist)
    setActiveView('playlist')
    setPlaylistLoading(true)
    try {
      const response = await request('Spotify/GetPlaylistTracks', {
        userId: spotifyUserId,
        playlistId: playlist.id
      })
      setPlaylistTracks(response?.data?.tracks ?? [])
    } catch {
      setPlaylistTracks([])
    }
    setPlaylistLoading(false)
  }

  // ── Helpers ──
  const formatTime = (ms) => {
    if (!ms || ms < 0) return '0:00'
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (localProgress / duration) * 100 : 0

  const getDeviceIcon = (type) => {
    if (!type) return faLaptop
    const t = type.toLowerCase()
    if (t.includes('phone') || t.includes('mobile') || t.includes('smartphone')) return faMobileScreen
    if (t.includes('speaker')) return faDesktop
    return faLaptop
  }

  // ── Not linked view ──
  if (!isLinked) {
    return (
      <div className="app-page spotify-app">
        <div className="spotify-top-bar">
          <button className="spotify-back-btn" onClick={() => navigate('/')}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <div className="spotify-top-brand">
            <FontAwesomeIcon icon={faSpotify} className="spotify-top-logo" />
            <span>Spotify</span>
          </div>
          <span className="spotify-top-time">{clockStr}</span>
        </div>
        <div className="spotify-connect">
          <div className="spotify-connect-card">
            <FontAwesomeIcon icon={faSpotify} className="spotify-connect-logo" />
            <h2>Connect to Spotify</h2>
            <p>Link your Spotify account to control playback</p>
            {linkQr ? (
              <div className="spotify-qr-container">
                <img src={linkQr} alt="Spotify QR Code" className="spotify-qr" />
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
    )
  }

  const activeDevice = devices.find(d => d.isActive)

  // ── Render main content based on activeView ──
  const renderMainContent = () => {
    // Search view
    if (activeView === 'search') {
      return (
        <div className="spotify-search-view">
          <div className="search-bar">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
            <input
              type="text"
              placeholder="What do you want to play?"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>
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
                    {track.imageUrl ? (
                      <img src={track.imageUrl} alt="" />
                    ) : (
                      <div className="track-item-art-placeholder">
                        <FontAwesomeIcon icon={faMusic} />
                      </div>
                    )}
                  </div>
                  <div className="track-item-info">
                    <span className="track-item-title">{track.name}</span>
                    <span className="track-item-artist">{track.artistName}</span>
                  </div>
                  <span className="track-item-duration">{formatTime(track.durationMs)}</span>
                </div>
              ))}
            </div>
          )}
          {!searchLoading && searchQuery && searchResults.length === 0 && (
            <div className="search-empty">No results found for "{searchQuery}"</div>
          )}
        </div>
      )
    }

    // Playlist view
    if (activeView === 'playlist' && viewPlaylist) {
      return (
        <div className="spotify-playlist-view">
          <div className="playlist-view-header">
            <button className="playlist-back-btn" onClick={() => setActiveView('nowPlaying')}>
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
          {playlistLoading && <div className="search-loading">Loading tracks...</div>}
          {!playlistLoading && playlistTracks.length > 0 && (
            <div className="track-list">
              {playlistTracks.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  className={`track-item ${player?.songId === track.id ? 'playing' : ''}`}
                  onClick={() => handlePlayTrack(track.uri)}
                >
                  <span className="track-index">
                    {player?.songId === track.id ? (
                      <FontAwesomeIcon icon={faMusic} className="track-playing-icon" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="track-item-art">
                    {track.imageUrl ? (
                      <img src={track.imageUrl} alt="" />
                    ) : (
                      <div className="track-item-art-placeholder">
                        <FontAwesomeIcon icon={faMusic} />
                      </div>
                    )}
                  </div>
                  <div className="track-item-info">
                    <span className="track-item-title">{track.name}</span>
                    <span className="track-item-artist">{track.artistName}</span>
                  </div>
                  <span className="track-item-duration">{formatTime(track.durationMs)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Now Playing view (default)
    return (
      <>
        {/* Now Playing Hero */}
        <div className="now-playing-hero">
          <div className="now-playing-art">
            {player?.songImage ? (
              <img src={player.songImage} alt="Album Art" />
            ) : (
              <div className="now-playing-art-placeholder">
                <FontAwesomeIcon icon={faCompactDisc} />
              </div>
            )}
          </div>
          <div className="now-playing-info">
            <h1 className="now-playing-title">
              {player?.songName || 'Nothing Playing'}
            </h1>
            <p className="now-playing-artist">
              {player?.artistName || 'Play something on Spotify'}
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
                  onClick={() => handlePlayTrack(`spotify:track:${track.songId}`)}
                >
                  <span className="track-index">{i + 1}</span>
                  <div className="track-item-art">
                    {track.songImage ? (
                      <img src={track.songImage} alt="" />
                    ) : (
                      <div className="track-item-art-placeholder">
                        <FontAwesomeIcon icon={faMusic} />
                      </div>
                    )}
                  </div>
                  <div className="track-item-info">
                    <span className="track-item-title">{track.songName}</span>
                    <span className="track-item-artist">{track.artistName}</span>
                  </div>
                  <span className="track-item-duration">{formatTime(track.durationMs)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Main player view ──
  return (
    <div className="app-page spotify-app">
      <div className="spotify-top-bar">
        <button className="spotify-back-btn" onClick={() => navigate('/')}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className="spotify-top-brand">
          <FontAwesomeIcon icon={faSpotify} className="spotify-top-logo" />
          <span>Spotify</span>
        </div>
        <span className="spotify-top-time">{clockStr}</span>
      </div>

      <div className="spotify-layout">
        {/* ── Sidebar ── */}
        <aside className="spotify-sidebar">
          <div className="sidebar-header">
            <FontAwesomeIcon icon={faListUl} />
            <span>Your Library</span>
          </div>

          {/* Now Playing link */}
          <div
            className={`sidebar-nav-item ${activeView === 'nowPlaying' ? 'active' : ''}`}
            onClick={() => setActiveView('nowPlaying')}
          >
            <FontAwesomeIcon icon={faMusic} />
            <span>Now Playing</span>
          </div>

          {/* Search link */}
          <div
            className={`sidebar-nav-item ${activeView === 'search' ? 'active' : ''}`}
            onClick={() => setActiveView('search')}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span>Search</span>
          </div>

          <div className="sidebar-divider" />

          <div className="playlist-list">
            {playlists.length === 0 && (
              <div className="playlist-empty">No playlists found</div>
            )}
            {playlists.map(pl => (
              <div
                key={pl.id}
                className={`playlist-item ${activePlaylistId === pl.id ? 'active' : ''} ${activeView === 'playlist' && viewPlaylist?.id === pl.id ? 'viewing' : ''}`}
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
        <main className="spotify-main">
          {renderMainContent()}
        </main>
      </div>

      {/* ── Bottom Player Bar ── */}
      <div className="spotify-player-bar">
        {/* Left: track info */}
        <div className="player-left">
          <div className="player-thumb">
            {player?.songImage ? (
              <img src={player.songImage} alt="" />
            ) : (
              <div className="player-thumb-placeholder">
                <FontAwesomeIcon icon={faMusic} />
              </div>
            )}
          </div>
          <div className="player-track-info">
            <span className="player-track-name">{player?.songName || '—'}</span>
            <span className="player-track-artist">{player?.artistName || ''}</span>
          </div>
        </div>

        {/* Center: controls + progress */}
        <div className="player-center">
          <div className="player-controls">
            <button
              className={`player-btn player-btn-sm ${shuffle ? 'active' : ''}`}
              onClick={handleShuffle}
            >
              <FontAwesomeIcon icon={faShuffle} />
            </button>
            <button className="player-btn" onClick={handlePrevious}>
              <FontAwesomeIcon icon={faBackwardStep} />
            </button>
            <button className="player-btn play-btn" onClick={handlePlayPause}>
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>
            <button className="player-btn" onClick={handleNext}>
              <FontAwesomeIcon icon={faForwardStep} />
            </button>
            <button
              className={`player-btn player-btn-sm ${repeat !== 'off' ? 'active' : ''}`}
              onClick={handleRepeat}
            >
              <FontAwesomeIcon icon={faRepeat} />
              {repeat === 'track' && <span className="repeat-badge">1</span>}
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
              className={`player-device-btn ${showDeviceMenu ? 'open' : ''}`}
              onClick={() => setShowDeviceMenu(!showDeviceMenu)}
            >
              <FontAwesomeIcon icon={getDeviceIcon(activeDevice?.type)} />
              <span>{activeDevice?.name || 'No device'}</span>
            </button>

            {showDeviceMenu && (
              <div className="device-menu">
                <div className="device-menu-header">Select a device</div>
                {devices.length === 0 && (
                  <div className="device-menu-empty">No devices available</div>
                )}
                {devices.map(d => (
                  <div
                    key={d.id}
                    className={`device-menu-item ${d.isActive ? 'active' : ''}`}
                    onClick={() => handleTransferDevice(d.id)}
                  >
                    <FontAwesomeIcon icon={getDeviceIcon(d.type)} />
                    <div className="device-menu-item-info">
                      <span className="device-menu-item-name">{d.name}</span>
                      <span className="device-menu-item-type">{d.type}</span>
                    </div>
                    {d.isActive && <FontAwesomeIcon icon={faCheck} className="device-active-check" />}
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
  )
}
