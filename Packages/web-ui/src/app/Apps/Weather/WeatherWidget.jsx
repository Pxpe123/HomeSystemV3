/*
 * WeatherWidget - Full weather display with 5-day forecast
 * Receives data from WebSocket context via props
 */

import { useState, useRef, useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faLocationDot,
  faTemperatureHalf,
  faDroplet,
  faWind,
  faEye,
  faTriangleExclamation,
  faSun,
  faCloud,
  faCloudRain,
  faCloudShowersHeavy,
  faCloudBolt,
  faSnowflake,
  faSmog
} from "@fortawesome/free-solid-svg-icons"
import "./WeatherWidget.css"

const weatherIcons = {
  Clear: { icon: faSun, gradient: "linear-gradient(135deg, #FFD93D 0%, #FF9A3D 100%)", glow: "rgba(255, 200, 55, 0.6)" },
  Clouds: { icon: faCloud, gradient: "linear-gradient(135deg, #A2A0A0 0%, #BDBDBD 100%)", glow: "rgba(180, 180, 180, 0.4)" },
  Rain: { icon: faCloudRain, gradient: "linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)", glow: "rgba(74, 144, 226, 0.5)" },
  Drizzle: { icon: faCloudShowersHeavy, gradient: "linear-gradient(135deg, #7CB9E8 0%, #4A90E2 100%)", glow: "rgba(124, 185, 232, 0.5)" },
  Thunderstorm: { icon: faCloudBolt, gradient: "linear-gradient(135deg, #4A5568 0%, #2D3748 100%)", glow: "rgba(74, 85, 104, 0.5)" },
  Snow: { icon: faSnowflake, gradient: "linear-gradient(135deg, #E8F5FF 0%, #B8D4E8 100%)", glow: "rgba(200, 220, 255, 0.6)" },
  Mist: { icon: faSmog, gradient: "linear-gradient(135deg, #D7D7D7 0%, #A8A8A8 100%)", glow: "rgba(180, 180, 180, 0.4)" },
  Fog: { icon: faSmog, gradient: "linear-gradient(135deg, #D7D7D7 0%, #A8A8A8 100%)", glow: "rgba(180, 180, 180, 0.4)" },
  Haze: { icon: faSmog, gradient: "linear-gradient(135deg, #F5F5DC 0%, #D3D3D3 100%)", glow: "rgba(200, 200, 180, 0.4)" }
}

// Wind direction helper
function getWindDirection(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return directions[Math.round(deg / 45) % 8]
}

export default function WeatherWidget({
  weather,
  forecast = [],
  city = "Loading...",
  connected = false,
  nextRefreshIn = 0
}) {
  const [selectedForecastDay, setSelectedForecastDay] = useState(null)
  const containerRef = useRef()

  // Comfort index calculation
  const comfortIndex = useMemo(() => {
    if (!weather) return null
    const temp = weather.temp
    const humidity = weather.humidity
    // Simple comfort calculation
    if (temp >= 18 && temp <= 24 && humidity >= 30 && humidity <= 60) return { level: "Ideal", color: "#4caf50" }
    if (temp >= 15 && temp <= 28 && humidity >= 20 && humidity <= 70) return { level: "Good", color: "#8bc34a" }
    if (temp < 10 || temp > 32 || humidity > 80) return { level: "Poor", color: "#f44336" }
    return { level: "Fair", color: "#ff9800" }
  }, [weather])

  // Get weather styling
  const getWeatherStyle = (condition) => {
    return weatherIcons[condition] || weatherIcons.Clear
  }

  if (!weather) {
    return (
      <div ref={containerRef} className="Weather-Container loading">
        <div className="weather-loading">
          <div className="loading-spinner" />
          <span>Loading weather...</span>
        </div>
      </div>
    )
  }

  if (!connected && !weather) {
    return (
      <div ref={containerRef} className="Weather-Container error">
        <div className="weather-error">
          <div className="error-icon">
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </div>
          <div className="error-text">
            <div className="error-title">Weather Unavailable</div>
            <div className="error-subtitle">Check connection</div>
          </div>
        </div>
      </div>
    )
  }

  const weatherStyle = getWeatherStyle(weather.condition)

  return (
    <div ref={containerRef} className="Weather-Container" style={{ '--weather-glow': weatherStyle.glow }}>
      {/* Header */}
      <div className="weather-header">
        <div className="weather-location">
          <span className="location-icon">
            <FontAwesomeIcon icon={faLocationDot} />
          </span>
          <span className="location-name">{city}</span>
        </div>
        <div className="refresh-badge">
          <span className={`connection-dot ${connected ? '' : 'disconnected'}`} />
          <span className="refresh-time">{connected ? `${nextRefreshIn}s` : 'Offline'}</span>
        </div>
      </div>

      {/* Main Weather Display */}
      <div className="weather-main">
        <div className="weather-icon-container">
          <div className="weather-icon-glow" />
          <div className="weather-icon-large" style={{ background: weatherStyle.gradient }}>
            <FontAwesomeIcon icon={weatherStyle.icon} />
          </div>
        </div>
        <div className="weather-condition-badge">
          {weather.description || weather.condition}
        </div>
        <div className="weather-temp-section">
          <div className="temperature">{Math.round(weather.temp)}°</div>
          <div className="temp-range">
            <span className="temp-high">H: {Math.round(weather.tempMax || weather.temp)}°</span>
            <span className="temp-low">L: {Math.round(weather.tempMin || weather.temp)}°</span>
          </div>
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="weather-details-grid">
        <div className="detail-card">
          <div className="detail-icon">
            <FontAwesomeIcon icon={faTemperatureHalf} />
          </div>
          <div className="detail-info">
            <div className="detail-label">Feels Like</div>
            <div className="detail-value">{Math.round(weather.feelsLike || weather.temp)}°C</div>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-icon">
            <FontAwesomeIcon icon={faDroplet} />
          </div>
          <div className="detail-info">
            <div className="detail-label">Humidity</div>
            <div className="detail-value">{weather.humidity}%</div>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-icon">
            <FontAwesomeIcon icon={faWind} />
          </div>
          <div className="detail-info">
            <div className="detail-label">Wind</div>
            <div className="detail-value">{weather.windSpeed} km/h {getWindDirection(weather.windDeg || 0)}</div>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-icon">
            <FontAwesomeIcon icon={faEye} />
          </div>
          <div className="detail-info">
            <div className="detail-label">Visibility</div>
            <div className="detail-value">{weather.visibility} km</div>
          </div>
        </div>
      </div>

      {/* Comfort & Pressure Bar */}
      <div className="weather-stats-bar">
        <div className="stat-item">
          <span className="stat-label">Comfort</span>
          <span className="stat-value" style={{ color: comfortIndex?.color }}>{comfortIndex?.level}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">Pressure</span>
          <span className="stat-value">{weather.pressure} hPa</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">Clouds</span>
          <span className="stat-value">{weather.clouds || 0}%</span>
        </div>
      </div>

      {/* 5-Day Forecast */}
      {forecast.length > 0 && (
        <div className="weather-forecast">
          <div className="forecast-header">5-Day Forecast</div>
          <div className="forecast-days">
            {forecast.slice(0, 5).map((f, idx) => {
              const fStyle = getWeatherStyle(f.condition)
              return (
                <button
                  key={f.date || idx}
                  className={`forecast-day ${selectedForecastDay === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedForecastDay(selectedForecastDay === idx ? null : idx)}
                >
                  <div className="forecast-day-name">
                    {f.dayName || new Date(f.date).toLocaleDateString("en-GB", { weekday: "short" })}
                  </div>
                  <div className="forecast-icon">
                  <FontAwesomeIcon icon={fStyle.icon} />
                </div>
                  <div className="forecast-temp">{Math.round(f.temp)}°</div>
                </button>
              )
            })}
          </div>
          {selectedForecastDay !== null && forecast[selectedForecastDay] && (
            <div className="forecast-detail">
              <span><FontAwesomeIcon icon={faDroplet} /> {forecast[selectedForecastDay].humidity}%</span>
              <span><FontAwesomeIcon icon={faWind} /> {forecast[selectedForecastDay].windSpeed} km/h</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
