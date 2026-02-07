/*
 * SpotifyApp - Spotify music player and control
 * Shows currently playing, playlists, and playback controls
 */

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlay,
  faPause,
  faForward,
  faBackward,
  faVolumeHigh,
  faVolumeLow,
  faVolumeOff,
  faShuffle,
  faRepeat,
  faHeart,
  faMusic,
  faCompactDisc,
  faLink,
  faQrcode
} from '@fortawesome/free-solid-svg-icons'
import { faSpotify } from '@fortawesome/free-brands-svg-icons'
import { AppTopBar } from '../components'
import { useWebSocket, useProfile } from '../../../context'
import '../AppPage.css'
import './SpotifyApp.css'

export default function SpotifyApp() {
  const { request } = useWebSocket()
  const { currentProfile } = useProfile()
  const [player, setPlayer] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const [progress, setProgress] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState('off')
  const [liked, setLiked] = useState(false)
  const [linkQr, setLinkQr] = useState(null)
  const [isLinked, setIsLinked] = useState(false)

  useEffect(() => {
    checkSpotifyLink()
  }, [currentProfile])

  const checkSpotifyLink = async () => {
    if (currentProfile?.spotifyProfileId) {
      setIsLinked(true)
      // Fetch current playback state
      try {
        const response = await request('Spotify/GetPlaybackState', {})
        if (response.data) {
          setPlayer(response.data)
          setIsPlaying(response.data.isPlaying)
        }
      } catch (err) {
        console.error('Failed to get playback state:', err)
      }
    } else {
      setIsLinked(false)
    }
  }

  const handleLinkSpotify = async () => {
    try {
      const response = await request('Spotify/GetQR', {})
      if (response.data?.qrCode) {
        setLinkQr(response.data.qrCode)
      }
    } catch (err) {
      console.error('Failed to get Spotify QR:', err)
    }
  }

  const handlePlayPause = async () => {
    try {
      await request(isPlaying ? 'Spotify/Pause' : 'Spotify/Play', {})
      setIsPlaying(!isPlaying)
    } catch (err) {
      console.error('Playback control failed:', err)
    }
  }

  const handleNext = async () => {
    try {
      await request('Spotify/Next', {})
    } catch (err) {
      console.error('Next failed:', err)
    }
  }

  const handlePrevious = async () => {
    try {
      await request('Spotify/Previous', {})
    } catch (err) {
      console.error('Previous failed:', err)
    }
  }

  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume)
    try {
      await request('Spotify/SetVolume', { volume: newVolume })
    } catch (err) {
      console.error('Volume change failed:', err)
    }
  }

  const formatTime = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / 1000 / 60) % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getVolumeIcon = () => {
    if (volume === 0) return faVolumeOff
    if (volume < 50) return faVolumeLow
    return faVolumeHigh
  }

  // Not linked - show link button
  if (!isLinked) {
    return (
      <div className="app-page spotify-app">
        <AppTopBar title="Spotify" />

        <div className="app-content spotify-not-linked">
          <FontAwesomeIcon icon={faSpotify} className="spotify-logo" />
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
    )
  }

  return (
    <div className="app-page spotify-app">
      <AppTopBar title="Spotify" />

      <div className="app-content">
        {/* Now Playing */}
        <div className="spotify-now-playing">
          <div className="album-art">
            {player?.albumArt ? (
              <img src={player.albumArt} alt="Album Art" />
            ) : (
              <div className="album-art-placeholder">
                <FontAwesomeIcon icon={faCompactDisc} />
              </div>
            )}
          </div>

          <div className="track-info">
            <h2 className="track-title">{player?.trackName || 'No track playing'}</h2>
            <p className="track-artist">{player?.artistName || 'Unknown artist'}</p>
            <p className="track-album">{player?.albumName || ''}</p>
          </div>

          <button
            className={`like-btn ${liked ? 'liked' : ''}`}
            onClick={() => setLiked(!liked)}
          >
            <FontAwesomeIcon icon={faHeart} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="spotify-progress">
          <span className="progress-time">{formatTime(progress)}</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(progress / (player?.duration || 1)) * 100}%` }}
            />
          </div>
          <span className="progress-time">{formatTime(player?.duration || 0)}</span>
        </div>

        {/* Playback Controls */}
        <div className="spotify-controls">
          <button
            className={`control-btn secondary ${shuffle ? 'active' : ''}`}
            onClick={() => setShuffle(!shuffle)}
          >
            <FontAwesomeIcon icon={faShuffle} />
          </button>

          <button className="control-btn" onClick={handlePrevious}>
            <FontAwesomeIcon icon={faBackward} />
          </button>

          <button className="control-btn primary" onClick={handlePlayPause}>
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>

          <button className="control-btn" onClick={handleNext}>
            <FontAwesomeIcon icon={faForward} />
          </button>

          <button
            className={`control-btn secondary ${repeat !== 'off' ? 'active' : ''}`}
            onClick={() => setRepeat(repeat === 'off' ? 'context' : repeat === 'context' ? 'track' : 'off')}
          >
            <FontAwesomeIcon icon={faRepeat} />
            {repeat === 'track' && <span className="repeat-one">1</span>}
          </button>
        </div>

        {/* Volume Control */}
        <div className="spotify-volume">
          <FontAwesomeIcon icon={getVolumeIcon()} />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          />
          <span>{volume}%</span>
        </div>

        {/* Device Info */}
        {player?.device && (
          <div className="spotify-device">
            <FontAwesomeIcon icon={faMusic} />
            <span>Playing on {player.device}</span>
          </div>
        )}
      </div>
    </div>
  )
}
