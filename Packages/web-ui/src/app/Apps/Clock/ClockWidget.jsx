/*
 * ClockWidget - Full clock with celestial arc, analog/digital toggle, stopwatch
 * Now receives sunTimes from WebSocket context via props
 */

import { useState, useEffect, useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSun, faMoon, faPlay, faPause, faRotateLeft, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons"
import "./ClockWidget.css"

export default function ClockWidget({ sunTimes = { sunrise: 6, sunset: 18 } }) {
  const [time, setTime] = useState(new Date())
  const [showAnalog, setShowAnalog] = useState(false)
  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [stopwatchTime, setStopwatchTime] = useState(0)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Stopwatch timer
  useEffect(() => {
    let interval
    if (stopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(prev => prev + 10)
      }, 10)
    }
    return () => clearInterval(interval)
  }, [stopwatchRunning])

  // Time calculations
  const hours = time.getHours().toString().padStart(2, "0")
  const minutes = time.getMinutes().toString().padStart(2, "0")
  const seconds = time.getSeconds().toString().padStart(2, "0")
  const hourDecimal = time.getHours() + time.getMinutes() / 60
  const { sunrise, sunset } = sunTimes

  // Time period and celestial calculations
  const { timePeriod, celestialIcon, celestialPosition } = useMemo(() => {
    let period = "night"
    let icon = faMoon
    let position = 0

    if (hourDecimal >= sunrise && hourDecimal <= sunset) {
      period = "day"
      icon = faSun
      position = ((hourDecimal - sunrise) / (sunset - sunrise)) * 100
      if (hourDecimal >= sunrise - 0.5 && hourDecimal < sunrise + 1) {
        period = "sunrise"
        icon = faSun
      } else if (hourDecimal >= sunset - 1 && hourDecimal <= sunset + 0.5) {
        period = "sunset"
        icon = faSun
      }
    } else {
      const nightDuration = (24 - sunset) + sunrise
      if (hourDecimal > sunset) {
        position = ((hourDecimal - sunset) / nightDuration) * 100
      } else {
        position = (((hourDecimal + 24) - sunset) / nightDuration) * 100
      }
    }
    return { timePeriod: period, celestialIcon: icon, celestialPosition: position }
  }, [hourDecimal, sunrise, sunset])

  // Calculate daylight remaining
  const daylightRemaining = useMemo(() => {
    if (hourDecimal < sunrise) {
      const hoursUntilSunrise = sunrise - hourDecimal
      const h = Math.floor(hoursUntilSunrise)
      const m = Math.round((hoursUntilSunrise - h) * 60)
      return { label: "Until sunrise", value: `${h}h ${m}m` }
    } else if (hourDecimal < sunset) {
      const hoursUntilSunset = sunset - hourDecimal
      const h = Math.floor(hoursUntilSunset)
      const m = Math.round((hoursUntilSunset - h) * 60)
      return { label: "Daylight left", value: `${h}h ${m}m` }
    } else {
      const hoursUntilSunrise = (24 - hourDecimal) + sunrise
      const h = Math.floor(hoursUntilSunrise)
      const m = Math.round((hoursUntilSunrise - h) * 60)
      return { label: "Until sunrise", value: `${h}h ${m}m` }
    }
  }, [hourDecimal, sunrise, sunset])

  // Day progress percentage
  const dayProgress = useMemo(() => {
    return Math.round((hourDecimal / 24) * 100)
  }, [hourDecimal])

  // Format time with AM/PM
  const period12h = time.getHours() >= 12 ? "PM" : "AM"

  // Date info
  const dayName = time.toLocaleDateString("en-GB", { weekday: "long" })
  const monthDay = time.toLocaleDateString("en-GB", { day: "numeric", month: "long" })
  const year = time.getFullYear()
  const weekNumber = getWeekNumber(time)

  // Analog clock calculations
  const hourDeg = (time.getHours() % 12 + time.getMinutes() / 60) * 30
  const minuteDeg = (time.getMinutes() + time.getSeconds() / 60) * 6
  const secondDeg = time.getSeconds() * 6

  // Stopwatch controls
  const toggleStopwatch = () => setStopwatchRunning(!stopwatchRunning)
  const resetStopwatch = () => { setStopwatchRunning(false); setStopwatchTime(0) }
  const formatStopwatch = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
    const secs = (totalSeconds % 60).toString().padStart(2, "0")
    const centis = Math.floor((ms % 1000) / 10).toString().padStart(2, "0")
    return `${mins}:${secs}.${centis}`
  }

  return (
    <div className={`Clock-Container ${timePeriod}`}>
      {/* Celestial Arc with improved visual */}
      <div className="celestial-arc">
        <svg className="arc-svg" viewBox="0 0 200 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--text-muted)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="var(--text-muted)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--text-muted)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M 10 90 Q 100 10 190 90"
            fill="none"
            stroke="url(#arcGradient)"
            strokeWidth="2"
          />
          {/* Horizon line */}
          <line x1="10" y1="90" x2="190" y2="90" stroke="var(--border-secondary)" strokeWidth="1" strokeDasharray="4,4" />
        </svg>
        <div
          className="celestial-body"
          style={{
            left: `${celestialPosition}%`,
            transform: `translateX(-50%) translateY(${Math.sin((celestialPosition / 100) * Math.PI) * -40}px)`,
          }}
        >
          <FontAwesomeIcon icon={celestialIcon} />
        </div>
      </div>

      {/* Header with full date */}
      <div className="clock-header">
        <div className="header-left">
          <div className="day-name">{dayName}</div>
          <div className="date-full">
            <span className="date-day">{monthDay}</span>
            <span className="date-year">{year}</span>
          </div>
        </div>
        <div className="header-right">
          <div className="time-period-indicator">
            <span className="period-label">{timePeriod}</span>
          </div>
          <div className="week-badge">W{weekNumber}</div>
        </div>
      </div>

      {/* Main time display - toggleable between digital and analog */}
      <div className="time-section" onClick={() => setShowAnalog(!showAnalog)}>
        {!showAnalog ? (
          <div className="time-display digital">
            <div className="time-main">
              <span className="hours">{hours}</span>
              <span className="separator">:</span>
              <span className="minutes">{minutes}</span>
            </div>
            <div className="time-suffix">
              <div className="seconds-display">{seconds}</div>
              <div className="period-12h">{period12h}</div>
            </div>
          </div>
        ) : (
          <div className="time-display analog">
            <div className="analog-clock">
              <div className="clock-face">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="hour-mark" style={{ transform: `rotate(${i * 30}deg)` }}>
                    <div className="mark-inner" />
                  </div>
                ))}
                <div className="hand hour-hand" style={{ transform: `rotate(${hourDeg}deg)` }} />
                <div className="hand minute-hand" style={{ transform: `rotate(${minuteDeg}deg)` }} />
                <div className="hand second-hand" style={{ transform: `rotate(${secondDeg}deg)` }} />
                <div className="center-dot" />
              </div>
            </div>
          </div>
        )}
        <div className="clock-mode-hint">tap to switch</div>
      </div>

      {/* Day progress bar */}
      <div className="day-progress-section">
        <div className="progress-header">
          <span className="progress-label">Day Progress</span>
          <span className="progress-value">{dayProgress}%</span>
        </div>
        <div className="day-progress-bar">
          <div className="day-progress-fill" style={{ width: `${dayProgress}%` }} />
          <div className="day-progress-marker sunrise-marker" style={{ left: `${(sunrise / 24) * 100}%` }} title="Sunrise" />
          <div className="day-progress-marker sunset-marker" style={{ left: `${(sunset / 24) * 100}%` }} title="Sunset" />
        </div>
        <div className="daylight-remaining">
          <span className="daylight-label">{daylightRemaining.label}</span>
          <span className="daylight-value">{daylightRemaining.value}</span>
        </div>
      </div>

      {/* Stopwatch mini widget */}
      <div className="stopwatch-section">
        <div className="stopwatch-display">{formatStopwatch(stopwatchTime)}</div>
        <div className="stopwatch-controls">
          <button className={`stopwatch-btn ${stopwatchRunning ? 'pause' : 'play'}`} onClick={toggleStopwatch}>
            <FontAwesomeIcon icon={stopwatchRunning ? faPause : faPlay} />
          </button>
          <button className="stopwatch-btn reset" onClick={resetStopwatch} disabled={stopwatchTime === 0}>
            <FontAwesomeIcon icon={faRotateLeft} />
          </button>
        </div>
      </div>

      {/* Sun times footer */}
      <div className="sun-moon-times">
        <div className="sun-moon-item">
          <div className="sun-moon-icon sunrise">
            <FontAwesomeIcon icon={faSun} />
            <FontAwesomeIcon icon={faArrowUp} className="sun-arrow" />
          </div>
          <div className="sun-moon-details">
            <div className="sun-moon-label">Sunrise</div>
            <div className="sun-moon-time">
              {Math.floor(sunrise).toString().padStart(2, "0")}:
              {Math.round((sunrise % 1) * 60).toString().padStart(2, "0")}
            </div>
          </div>
        </div>

        <div className="sun-moon-divider" />

        <div className="sun-moon-item center">
          <div className="daylight-duration">
            <div className="sun-moon-label">Daylight</div>
            <div className="sun-moon-time">{formatDuration(sunset - sunrise)}</div>
          </div>
        </div>

        <div className="sun-moon-divider" />

        <div className="sun-moon-item">
          <div className="sun-moon-icon sunset">
            <FontAwesomeIcon icon={faSun} />
            <FontAwesomeIcon icon={faArrowDown} className="sun-arrow" />
          </div>
          <div className="sun-moon-details">
            <div className="sun-moon-label">Sunset</div>
            <div className="sun-moon-time">
              {Math.floor(sunset).toString().padStart(2, "0")}:
              {Math.round((sunset % 1) * 60).toString().padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

// Helper function to format duration
function formatDuration(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}
