/*
 * PcManagerApp - Full PC management page
 * Wake-on-LAN, shutdown, status monitoring
 */

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDesktop,
  faLaptop,
  faServer,
  faPowerOff,
  faCircle,
  faPlus,
  faTrash,
  faWifi,
  faMicrochip,
  faMemory,
  faHardDrive
} from '@fortawesome/free-solid-svg-icons'
import { AppTopBar } from '../components'
import '../AppPage.css'
import './PcManagerApp.css'

// Mock data - will be replaced with actual backend integration
const mockPcs = [
  {
    id: 1,
    name: 'Gaming PC',
    type: 'desktop',
    status: 'online',
    ip: '192.168.1.10',
    mac: '00:1A:2B:3C:4D:5E',
    cpu: 45,
    ram: 62,
    disk: 78
  },
  {
    id: 2,
    name: 'Work Laptop',
    type: 'laptop',
    status: 'offline',
    ip: '192.168.1.11',
    mac: '00:1A:2B:3C:4D:5F',
    cpu: 0,
    ram: 0,
    disk: 0
  },
  {
    id: 3,
    name: 'Home Server',
    type: 'server',
    status: 'online',
    ip: '192.168.1.2',
    mac: '00:1A:2B:3C:4D:60',
    cpu: 12,
    ram: 45,
    disk: 55
  }
]

const pcIcons = {
  desktop: faDesktop,
  laptop: faLaptop,
  server: faServer
}

export default function PcManagerApp() {
  const [pcs, setPcs] = useState(mockPcs)
  const [selectedPc, setSelectedPc] = useState(null)

  const handleWakeOnLan = (pc) => {
    console.log('Sending WoL packet to:', pc.mac)
    // Will integrate with backend
  }

  const handleShutdown = (pc) => {
    console.log('Sending shutdown command to:', pc.ip)
    // Will integrate with backend
  }

  const onlineCount = pcs.filter(pc => pc.status === 'online').length

  return (
    <div className="app-page pcmanager-app">
      <AppTopBar title="PC Manager" />

      <div className="app-content">
        {/* Summary */}
        <div className="pcmanager-summary">
          <div className="summary-item">
            <FontAwesomeIcon icon={faDesktop} />
            <span>{pcs.length} Devices</span>
          </div>
          <div className="summary-item online">
            <FontAwesomeIcon icon={faCircle} />
            <span>{onlineCount} Online</span>
          </div>
          <button className="add-pc-btn">
            <FontAwesomeIcon icon={faPlus} />
            <span>Add PC</span>
          </button>
        </div>

        {/* PC List */}
        <div className="pc-cards">
          {pcs.map(pc => (
            <div key={pc.id} className={`pc-card ${pc.status}`}>
              <div className="pc-card-header">
                <FontAwesomeIcon icon={pcIcons[pc.type]} className="pc-type-icon" />
                <div className="pc-card-info">
                  <h3>{pc.name}</h3>
                  <span className="pc-card-ip">{pc.ip}</span>
                </div>
                <div className={`pc-card-status ${pc.status}`}>
                  <FontAwesomeIcon icon={faCircle} />
                  <span>{pc.status}</span>
                </div>
              </div>

              {pc.status === 'online' && (
                <div className="pc-card-stats">
                  <div className="stat-item">
                    <div className="stat-header">
                      <FontAwesomeIcon icon={faMicrochip} />
                      <span>CPU</span>
                    </div>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: `${pc.cpu}%` }} />
                    </div>
                    <span className="stat-value">{pc.cpu}%</span>
                  </div>
                  <div className="stat-item">
                    <div className="stat-header">
                      <FontAwesomeIcon icon={faMemory} />
                      <span>RAM</span>
                    </div>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: `${pc.ram}%` }} />
                    </div>
                    <span className="stat-value">{pc.ram}%</span>
                  </div>
                  <div className="stat-item">
                    <div className="stat-header">
                      <FontAwesomeIcon icon={faHardDrive} />
                      <span>Disk</span>
                    </div>
                    <div className="stat-bar">
                      <div className="stat-fill" style={{ width: `${pc.disk}%` }} />
                    </div>
                    <span className="stat-value">{pc.disk}%</span>
                  </div>
                </div>
              )}

              <div className="pc-card-actions">
                {pc.status === 'offline' ? (
                  <button
                    className="action-btn wake"
                    onClick={() => handleWakeOnLan(pc)}
                  >
                    <FontAwesomeIcon icon={faWifi} />
                    <span>Wake</span>
                  </button>
                ) : (
                  <button
                    className="action-btn shutdown"
                    onClick={() => handleShutdown(pc)}
                  >
                    <FontAwesomeIcon icon={faPowerOff} />
                    <span>Shutdown</span>
                  </button>
                )}
                <button className="action-btn delete">
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>

              <div className="pc-card-mac">
                MAC: {pc.mac}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
