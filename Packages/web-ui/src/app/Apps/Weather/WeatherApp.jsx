/*
 * WeatherApp - Full weather page with detailed forecasts
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSun,
  faCloud,
  faCloudRain,
  faCloudShowersHeavy,
  faSnowflake,
  faBolt,
  faSmog,
  faWind,
  faDroplet,
  faEye,
  faGauge,
  faTemperatureHigh,
  faTemperatureLow,
  faArrowUp,
  faArrowDown
} from '@fortawesome/free-solid-svg-icons'
import { AppTopBar } from '../components'
import { useWebSocket } from '../../../context'
import '../AppPage.css'
import './WeatherApp.css'

const weatherIcons = {
  Clear: faSun,
  Clouds: faCloud,
  Rain: faCloudRain,
  Drizzle: faCloudRain,
  Thunderstorm: faBolt,
  Snow: faSnowflake,
  Mist: faSmog,
  Fog: faSmog,
  Haze: faSmog
}

const getWeatherIcon = (condition) => {
  return weatherIcons[condition] || faCloud
}

export default function WeatherApp() {
  const { weather, forecast, sunTimes, location } = useWebSocket()

  const formatTemp = (temp) => `${Math.round(temp)}°`

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--'
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="app-page weather-app">
      <AppTopBar title="Weather" />

      <div className="app-content">
        {weather ? (
          <>
            {/* Current Weather Card */}
            <div className="weather-card weather-current-card">
              <div className="weather-card-header">
                <h3>{location.city}</h3>
                <span className="weather-date">
                  {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="weather-current-main">
                <FontAwesomeIcon
                  icon={getWeatherIcon(weather.condition)}
                  className="weather-icon-xl"
                />
                <div className="weather-current-temps">
                  <span className="weather-temp-large">{formatTemp(weather.temp)}</span>
                  <span className="weather-condition">{weather.description || weather.condition}</span>
                  <span className="weather-feels-like">Feels like {formatTemp(weather.feelsLike)}</span>
                </div>
              </div>
            </div>

            {/* Weather Details Card */}
            <div className="weather-card">
              <h3>Details</h3>
              <div className="weather-details-grid">
                <div className="weather-detail-item">
                  <FontAwesomeIcon icon={faDroplet} />
                  <div className="detail-info">
                    <span className="detail-value">{weather.humidity}%</span>
                    <span className="detail-label">Humidity</span>
                  </div>
                </div>
                <div className="weather-detail-item">
                  <FontAwesomeIcon icon={faWind} />
                  <div className="detail-info">
                    <span className="detail-value">{weather.windSpeed} km/h</span>
                    <span className="detail-label">Wind</span>
                  </div>
                </div>
                <div className="weather-detail-item">
                  <FontAwesomeIcon icon={faEye} />
                  <div className="detail-info">
                    <span className="detail-value">{weather.visibility} km</span>
                    <span className="detail-label">Visibility</span>
                  </div>
                </div>
                <div className="weather-detail-item">
                  <FontAwesomeIcon icon={faGauge} />
                  <div className="detail-info">
                    <span className="detail-value">{weather.pressure} hPa</span>
                    <span className="detail-label">Pressure</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sun Times Card */}
            {sunTimes && (
              <div className="weather-card">
                <h3>Sun</h3>
                <div className="sun-times">
                  <div className="sun-time">
                    <FontAwesomeIcon icon={faArrowUp} className="sun-icon sunrise" />
                    <div className="sun-info">
                      <span className="sun-label">Sunrise</span>
                      <span className="sun-value">{formatTime(sunTimes.sunrise)}</span>
                    </div>
                  </div>
                  <div className="sun-time">
                    <FontAwesomeIcon icon={faArrowDown} className="sun-icon sunset" />
                    <div className="sun-info">
                      <span className="sun-label">Sunset</span>
                      <span className="sun-value">{formatTime(sunTimes.sunset)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5-Day Forecast Card */}
            {forecast.length > 0 && (
              <div className="weather-card">
                <h3>5-Day Forecast</h3>
                <div className="forecast-list">
                  {forecast.slice(0, 5).map((day, index) => (
                    <div key={index} className="forecast-item">
                      <span className="forecast-day-name">{day.date}</span>
                      <FontAwesomeIcon
                        icon={getWeatherIcon(day.condition)}
                        className="forecast-day-icon"
                      />
                      <div className="forecast-temps">
                        <span className="forecast-high">
                          <FontAwesomeIcon icon={faTemperatureHigh} />
                          {formatTemp(day.high || day.temp)}
                        </span>
                        <span className="forecast-low">
                          <FontAwesomeIcon icon={faTemperatureLow} />
                          {formatTemp(day.low || day.temp - 5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="weather-loading-full">
            <div className="weather-loading-spinner" />
            <span>Loading weather data...</span>
          </div>
        )}
      </div>
    </div>
  )
}
