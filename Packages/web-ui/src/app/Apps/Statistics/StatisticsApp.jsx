/*
 * StatisticsApp - System statistics and usage data
 * Shows graphs, charts, and usage metrics
 */

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartLine,
  faChartBar,
  faChartPie,
  faArrowUp,
  faArrowDown,
  faMicrochip,
  faMemory,
  faHardDrive,
  faWifi,
  faThermometerHalf,
  faClock
} from '@fortawesome/free-solid-svg-icons'
import { AppTopBar } from '../components'
import '../AppPage.css'
import './StatisticsApp.css'

// Mock data
const systemStats = {
  cpu: { current: 45, avg: 38, max: 92 },
  memory: { used: 12.4, total: 32, percent: 39 },
  disk: { used: 456, total: 1000, percent: 46 },
  network: { down: 45.2, up: 12.8 },
  temp: 52
}

const usageHistory = [
  { time: '00:00', cpu: 20, memory: 35 },
  { time: '04:00', cpu: 15, memory: 32 },
  { time: '08:00', cpu: 45, memory: 48 },
  { time: '12:00', cpu: 65, memory: 55 },
  { time: '16:00', cpu: 55, memory: 52 },
  { time: '20:00', cpu: 40, memory: 45 },
  { time: 'Now', cpu: 45, memory: 39 }
]

export default function StatisticsApp() {
  const [timeRange, setTimeRange] = useState('24h')

  return (
    <div className="app-page statistics-app">
      <AppTopBar title="Statistics" />

      <div className="app-content">
        {/* Time Range Selector */}
        <div className="time-range">
          {['1h', '24h', '7d', '30d'].map(range => (
            <button
              key={range}
              className={timeRange === range ? 'active' : ''}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-card">
            <FontAwesomeIcon icon={faMicrochip} className="stat-icon cpu" />
            <div className="stat-info">
              <span className="stat-value">{systemStats.cpu.current}%</span>
              <span className="stat-label">CPU Usage</span>
            </div>
            <div className="stat-trend up">
              <FontAwesomeIcon icon={faArrowUp} />
              <span>+7%</span>
            </div>
          </div>

          <div className="stat-card">
            <FontAwesomeIcon icon={faMemory} className="stat-icon memory" />
            <div className="stat-info">
              <span className="stat-value">{systemStats.memory.used} GB</span>
              <span className="stat-label">Memory Used</span>
            </div>
            <div className="stat-trend down">
              <FontAwesomeIcon icon={faArrowDown} />
              <span>-3%</span>
            </div>
          </div>

          <div className="stat-card">
            <FontAwesomeIcon icon={faHardDrive} className="stat-icon disk" />
            <div className="stat-info">
              <span className="stat-value">{systemStats.disk.used} GB</span>
              <span className="stat-label">Disk Used</span>
            </div>
            <div className="stat-trend">
              <span>{systemStats.disk.percent}%</span>
            </div>
          </div>

          <div className="stat-card">
            <FontAwesomeIcon icon={faThermometerHalf} className="stat-icon temp" />
            <div className="stat-info">
              <span className="stat-value">{systemStats.temp}°C</span>
              <span className="stat-label">Temperature</span>
            </div>
          </div>
        </div>

        {/* Usage Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <FontAwesomeIcon icon={faChartLine} />
              <span>System Usage</span>
            </h3>
            <div className="chart-legend">
              <span className="legend-cpu">CPU</span>
              <span className="legend-memory">Memory</span>
            </div>
          </div>

          <div className="chart-container">
            <div className="chart-bars">
              {usageHistory.map((point, index) => (
                <div key={index} className="chart-bar-group">
                  <div className="bar-container">
                    <div
                      className="bar cpu"
                      style={{ height: `${point.cpu}%` }}
                    />
                    <div
                      className="bar memory"
                      style={{ height: `${point.memory}%` }}
                    />
                  </div>
                  <span className="bar-label">{point.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Network Stats */}
        <div className="network-card">
          <div className="network-header">
            <FontAwesomeIcon icon={faWifi} />
            <h3>Network</h3>
          </div>
          <div className="network-stats">
            <div className="network-stat">
              <FontAwesomeIcon icon={faArrowDown} className="download" />
              <div className="network-info">
                <span className="network-value">{systemStats.network.down} MB/s</span>
                <span className="network-label">Download</span>
              </div>
            </div>
            <div className="network-stat">
              <FontAwesomeIcon icon={faArrowUp} className="upload" />
              <div className="network-info">
                <span className="network-value">{systemStats.network.up} MB/s</span>
                <span className="network-label">Upload</span>
              </div>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="uptime-card">
          <FontAwesomeIcon icon={faClock} />
          <div className="uptime-info">
            <span className="uptime-label">System Uptime</span>
            <span className="uptime-value">14 days, 6 hours, 32 minutes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
