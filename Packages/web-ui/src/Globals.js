/**
 * Globals.js - Shared Variables & Connections
 *
 * Only holds truly shared state and connections.
 * All data fetching is done via WebSocket from the control-server.
 */

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================
export const env = {
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
}

// ============================================================
// SHARED STATE (updated by useWebSocket hook)
// ============================================================
export const location = {
  city: 'Loading...',
  lat: 0,
  lon: 0,
}

// ============================================================
// CONNECTIONS
// ============================================================
export const connections = {
  ws: null,
}

export function connectWS(url = env.WS_URL, handlers = {}) {
  if (connections.ws?.readyState === WebSocket.OPEN) {
    return connections.ws
  }

  connections.ws = new WebSocket(url)

  connections.ws.onopen = (e) => {
    if (env.DEBUG) console.log('[WS] Connected')
    handlers.onOpen?.(e)
  }

  connections.ws.onmessage = (e) => {
    try {
      handlers.onMessage?.(JSON.parse(e.data), e)
    } catch {
      handlers.onMessage?.(e.data, e)
    }
  }

  connections.ws.onclose = (e) => {
    if (env.DEBUG) console.log('[WS] Disconnected')
    handlers.onClose?.(e)
  }

  connections.ws.onerror = (e) => {
    console.error('[WS] Error:', e)
    handlers.onError?.(e)
  }

  return connections.ws
}

export function sendWS(data) {
  if (connections.ws?.readyState === WebSocket.OPEN) {
    connections.ws.send(typeof data === 'object' ? JSON.stringify(data) : data)
    return true
  }
  return false
}

export function closeWS() {
  connections.ws?.close()
  connections.ws = null
}

// ============================================================
// DEFAULT EXPORT
// ============================================================
export default {
  env,
  location,
  connections,
  connectWS,
  sendWS,
  closeWS,
}
