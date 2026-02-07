/*
 * CamerasApp - Security camera viewer
 * Shows camera feeds and recordings
 */

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faVideo,
  faVideoSlash,
  faExpand,
  faCompress,
  faCircle,
  faPlay,
  faPause,
  faVolumeHigh,
  faVolumeMute,
  faGear,
  faRotate,
  faMaximize
} from '@fortawesome/free-solid-svg-icons'
import { AppTopBar } from '../components'
import '../AppPage.css'
import './CamerasApp.css'

// Mock cameras
const mockCameras = [
  { id: 1, name: 'Front Door', status: 'online', recording: true },
  { id: 2, name: 'Back Yard', status: 'online', recording: true },
  { id: 3, name: 'Garage', status: 'offline', recording: false },
  { id: 4, name: 'Living Room', status: 'online', recording: false }
]

export default function CamerasApp() {
  const [cameras, setCameras] = useState(mockCameras)
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [layout, setLayout] = useState('grid') // grid, single

  const onlineCount = cameras.filter(c => c.status === 'online').length

  return (
    <div className="app-page cameras-app">
      <AppTopBar title="Cameras" />

      <div className="app-content">
        {/* Header */}
        <div className="cameras-header">
          <div className="cameras-status">
            <FontAwesomeIcon icon={faVideo} />
            <span>{onlineCount}/{cameras.length} online</span>
          </div>
          <div className="cameras-layout">
            <button
              className={layout === 'grid' ? 'active' : ''}
              onClick={() => { setLayout('grid'); setSelectedCamera(null); }}
            >
              Grid
            </button>
            <button
              className={layout === 'single' ? 'active' : ''}
              onClick={() => setLayout('single')}
            >
              Single
            </button>
          </div>
        </div>

        {/* Camera Grid */}
        {layout === 'grid' ? (
          <div className="cameras-grid">
            {cameras.map(camera => (
              <div
                key={camera.id}
                className={`camera-card ${camera.status}`}
                onClick={() => { setSelectedCamera(camera); setLayout('single'); }}
              >
                <div className="camera-feed">
                  {camera.status === 'online' ? (
                    <div className="camera-placeholder">
                      <FontAwesomeIcon icon={faVideo} />
                    </div>
                  ) : (
                    <div className="camera-offline">
                      <FontAwesomeIcon icon={faVideoSlash} />
                      <span>Offline</span>
                    </div>
                  )}
                </div>
                <div className="camera-info">
                  <div className="camera-name">
                    {camera.recording && (
                      <FontAwesomeIcon icon={faCircle} className="recording-dot" />
                    )}
                    <span>{camera.name}</span>
                  </div>
                  <button className="camera-expand">
                    <FontAwesomeIcon icon={faMaximize} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single Camera View */
          <div className="camera-single">
            {selectedCamera ? (
              <>
                <div className="camera-feed-large">
                  {selectedCamera.status === 'online' ? (
                    <div className="camera-placeholder large">
                      <FontAwesomeIcon icon={faVideo} />
                      <span>Live Feed: {selectedCamera.name}</span>
                    </div>
                  ) : (
                    <div className="camera-offline large">
                      <FontAwesomeIcon icon={faVideoSlash} />
                      <span>Camera Offline</span>
                    </div>
                  )}

                  {/* Camera Controls Overlay */}
                  <div className="camera-controls">
                    <div className="controls-left">
                      {selectedCamera.recording && (
                        <span className="recording-badge">
                          <FontAwesomeIcon icon={faCircle} />
                          REC
                        </span>
                      )}
                    </div>
                    <div className="controls-right">
                      <button><FontAwesomeIcon icon={faVolumeHigh} /></button>
                      <button><FontAwesomeIcon icon={faRotate} /></button>
                      <button><FontAwesomeIcon icon={faGear} /></button>
                      <button><FontAwesomeIcon icon={faExpand} /></button>
                    </div>
                  </div>
                </div>

                {/* Camera Thumbnails */}
                <div className="camera-thumbnails">
                  {cameras.map(camera => (
                    <button
                      key={camera.id}
                      className={`thumbnail ${camera.id === selectedCamera.id ? 'active' : ''} ${camera.status}`}
                      onClick={() => setSelectedCamera(camera)}
                    >
                      <FontAwesomeIcon icon={camera.status === 'online' ? faVideo : faVideoSlash} />
                      <span>{camera.name}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="camera-select-prompt">
                <FontAwesomeIcon icon={faVideo} />
                <span>Select a camera to view</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
