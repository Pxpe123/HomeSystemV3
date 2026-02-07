/*
 * Overview - Main dashboard page showing widgets
 */

import {
  ClockWidget,
  WeatherWidget,
  SmartHomeWidget,
  PcManagerWidget
} from '../../../Apps'
import { ActiveApps } from '../../../../components'
import { useWebSocket } from '../../../../context'
import './Overview.css'

export default function Overview() {
  const { connected, weather, forecast, sunTimes, location, nextRefreshIn } = useWebSocket()

  return (
    <div className="Page overview-page">
      <div className="page-gradient" />

      <ClockWidget sunTimes={sunTimes} />

      <WeatherWidget
        weather={weather}
        forecast={forecast}
        city={location.city}
        connected={connected}
        nextRefreshIn={nextRefreshIn}
      />

      <ActiveApps />

      <SmartHomeWidget />

      <PcManagerWidget />
    </div>
  )
}
