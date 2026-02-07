/*
 * SmartHomeApp - Full smart home control page
 * Controls lights, climate, and other devices via Home Assistant
 */

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLightbulb,
  faThermometerHalf,
  faPlug,
  faDoorOpen,
  faTv,
  faFan,
  faToggleOn,
  faToggleOff,
  faSliders
} from '@fortawesome/free-solid-svg-icons'
import { AppTopBar } from '../components'
import '../AppPage.css'
import './SmartHomeApp.css'

// Mock data - will be replaced with Home Assistant integration
const mockRooms = [
  {
    id: 'living',
    name: 'Living Room',
    devices: [
      { id: 'light1', name: 'Ceiling Light', type: 'light', state: true, brightness: 80 },
      { id: 'light2', name: 'Lamp', type: 'light', state: false, brightness: 0 },
      { id: 'tv1', name: 'TV', type: 'media', state: true },
      { id: 'plug1', name: 'Fan', type: 'plug', state: false }
    ]
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    devices: [
      { id: 'light3', name: 'Main Light', type: 'light', state: false, brightness: 0 },
      { id: 'light4', name: 'Bedside Lamp', type: 'light', state: true, brightness: 30 },
      { id: 'fan1', name: 'AC', type: 'climate', state: true, temp: 22 }
    ]
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    devices: [
      { id: 'light5', name: 'Kitchen Light', type: 'light', state: true, brightness: 100 },
      { id: 'plug2', name: 'Coffee Maker', type: 'plug', state: false }
    ]
  }
]

const deviceIcons = {
  light: faLightbulb,
  climate: faThermometerHalf,
  plug: faPlug,
  lock: faDoorOpen,
  media: faTv,
  fan: faFan
}

export default function SmartHomeApp() {
  const [rooms, setRooms] = useState(mockRooms)
  const [selectedDevice, setSelectedDevice] = useState(null)

  const toggleDevice = (roomId, deviceId) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          devices: room.devices.map(device =>
            device.id === deviceId ? { ...device, state: !device.state } : device
          )
        }
      }
      return room
    }))
  }

  const updateBrightness = (roomId, deviceId, brightness) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          devices: room.devices.map(device =>
            device.id === deviceId ? { ...device, brightness, state: brightness > 0 } : device
          )
        }
      }
      return room
    }))
  }

  const totalDevices = rooms.reduce((acc, room) => acc + room.devices.length, 0)
  const activeDevices = rooms.reduce((acc, room) =>
    acc + room.devices.filter(d => d.state).length, 0)

  return (
    <div className="app-page smarthome-app">
      <AppTopBar title="Smart Home" />

      <div className="app-content">
        {/* Summary Card */}
        <div className="smarthome-summary">
          <div className="summary-stat">
            <span className="stat-value">{activeDevices}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-stat">
            <span className="stat-value">{totalDevices}</span>
            <span className="stat-label">Devices</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-stat">
            <span className="stat-value">{rooms.length}</span>
            <span className="stat-label">Rooms</span>
          </div>
        </div>

        {/* Room Cards */}
        {rooms.map(room => (
          <div key={room.id} className="room-card">
            <div className="room-header">
              <h3>{room.name}</h3>
              <span className="room-status">
                {room.devices.filter(d => d.state).length} / {room.devices.length} on
              </span>
            </div>

            <div className="room-devices">
              {room.devices.map(device => (
                <div
                  key={device.id}
                  className={`device-card ${device.state ? 'active' : ''}`}
                >
                  <div className="device-header">
                    <FontAwesomeIcon icon={deviceIcons[device.type] || faPlug} />
                    <span className="device-name">{device.name}</span>
                    <button
                      className="device-toggle"
                      onClick={() => toggleDevice(room.id, device.id)}
                    >
                      <FontAwesomeIcon icon={device.state ? faToggleOn : faToggleOff} />
                    </button>
                  </div>

                  {device.type === 'light' && device.state && (
                    <div className="device-slider">
                      <FontAwesomeIcon icon={faSliders} />
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={device.brightness}
                        onChange={(e) => updateBrightness(room.id, device.id, parseInt(e.target.value))}
                      />
                      <span>{device.brightness}%</span>
                    </div>
                  )}

                  {device.type === 'climate' && (
                    <div className="device-temp">
                      <span>{device.temp}°C</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
