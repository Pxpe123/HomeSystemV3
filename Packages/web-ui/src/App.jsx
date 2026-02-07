/*
 * App - Root component for HomeSystem web UI
 * Sets up routing, authentication, and global providers.
 */

import { Routes, Route, Outlet } from 'react-router-dom'
import { Home } from './app/Index'
import { SpotifySuccess } from './callbacks'
import { WebSocketProvider, ProfileProvider, useProfile } from './context'
import { ErrorBoundary, LoginScreen } from './components'
import {
  SpotifyApp,
  PcManagerApp,
  SmartHomeApp,
  WeatherApp,
  SettingsApp,
  StatisticsApp,
  NotificationsApp,
  CamerasApp
} from './app/Apps'


function AppLayout() {
  return (
    <div className="MainContainer MainContainer-ImageBG">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}

function ProtectedApp() {
  const { isLoggedIn } = useProfile()

  if (!isLoggedIn) {
    return <LoginScreen />
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/app/spotify" element={<SpotifyApp />} />
        <Route path="/app/pcmanager" element={<PcManagerApp />} />
        <Route path="/app/smarthome" element={<SmartHomeApp />} />
        <Route path="/app/weather" element={<WeatherApp />} />
        <Route path="/app/settings" element={<SettingsApp />} />
        <Route path="/app/statistics" element={<StatisticsApp />} />
        <Route path="/app/notifications" element={<NotificationsApp />} />
        <Route path="/app/cameras" element={<CamerasApp />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <WebSocketProvider>
      <ProfileProvider>
        <Routes>
          <Route path="/Spotify/Callback/Success" element={<SpotifySuccess />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </ProfileProvider>
    </WebSocketProvider>
  )
}
