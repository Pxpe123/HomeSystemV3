/*
 * WebSocketContext - Real-time communication with the control server
 * Manages connection state, weather data, and request/response handling.
 * Auto-reconnects on disconnect and syncs refresh timers with server.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import G from '../Globals'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  // Connection state
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimeout = useRef(null)
  const requestHandlers = useRef(new Map())

  // Weather data (synced from server)
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [sunTimes, setSunTimes] = useState({ sunrise: 6, sunset: 18 })
  const [location, setLocation] = useState({ city: 'Loading...', lat: 0, lon: 0 })
  const [nextRefreshIn, setNextRefreshIn] = useState(0)

  /**
   * Sends a request to the server and waits for response.
   * Uses UUID-based request tracking for async responses.
   */
  const request = useCallback((type, data = {}) => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      const requestId = crypto.randomUUID()

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        requestHandlers.current.delete(requestId)
        reject(new Error('Request timeout'))
      }, 10000)

      // Store handler for when response arrives
      requestHandlers.current.set(requestId, (response) => {
        clearTimeout(timeout)
        resolve(response)
      })

      wsRef.current.send(JSON.stringify({
        Type: type,
        RequestId: requestId,
        Data: data
      }))
    })
  }, [])

  /**
   * Fetches weather, forecast, and location data from server.
   * Called on connect and when refresh timer expires.
   */
  const fetchAllData = useCallback(async () => {
    try {
      const weatherData = await request('Weather/GetWeather')
      if (weatherData) {
        setWeather(weatherData.weather)
        setSunTimes(weatherData.sunTimes || { sunrise: 6, sunset: 18 })
        setNextRefreshIn(weatherData.secondsUntilRefresh ?? 0)

        if (weatherData.location) {
          const loc = {
            city: weatherData.location.city,
            lat: weatherData.location.lat,
            lon: weatherData.location.lon
          }
          setLocation(loc)
          G.location.city = loc.city
          G.location.lat = loc.lat
          G.location.lon = loc.lon
        }
      }

      const forecastData = await request('Weather/GetForecast')
      if (forecastData) {
        setForecast(Array.isArray(forecastData) ? forecastData : [])
      }
    } catch (err) {
      if (G.env.DEBUG) {
        console.error('[WS] Failed to fetch data:', err.message)
      }
    }
  }, [request])

  /**
   * Establishes WebSocket connection to the server.
   * Auto-reconnects after 3 seconds on disconnect.
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(G.env.WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (G.env.DEBUG) console.log('[WS] Connected')
      setConnected(true)

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }

      fetchAllData()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        // Handle response to a previous request
        if (msg.requestId && requestHandlers.current.has(msg.requestId)) {
          requestHandlers.current.get(msg.requestId)(msg.data)
          requestHandlers.current.delete(msg.requestId)
          return
        }

        // Handle server-initiated push messages
        if (msg.type === 'weatherUpdate') {
          setWeather(msg.data?.weather)
          setSunTimes(msg.data?.sunTimes || { sunrise: 6, sunset: 18 })
          setNextRefreshIn(msg.data?.secondsUntilRefresh ?? 0)
        }
      } catch (err) {
        if (G.env.DEBUG) console.error('[WS] Parse error:', err)
      }
    }

    ws.onclose = () => {
      if (G.env.DEBUG) console.log('[WS] Disconnected')
      setConnected(false)
      wsRef.current = null
      reconnectTimeout.current = setTimeout(connect, 3000)
    }

    ws.onerror = (err) => {
      if (G.env.DEBUG) console.error('[WS] Error:', err)
    }
  }, [fetchAllData])

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  // Countdown timer that syncs with server refresh schedule
  useEffect(() => {
    if (!connected) return

    const interval = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          fetchAllData()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [connected, fetchAllData])

  const value = {
    connected,
    weather,
    forecast,
    sunTimes,
    location,
    nextRefreshIn,
    request,
    refresh: fetchAllData
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

/**
 * Hook to access WebSocket context.
 * Must be used within a WebSocketProvider.
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export default WebSocketContext
