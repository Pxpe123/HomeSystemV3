/*
 * NotificationsApp - Notification center
 * Shows all system notifications and alerts
 */

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faBellSlash,
  faCheck,
  faTrash,
  faCircle,
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import { AppTopBar } from '../components'
import '../AppPage.css'
import './NotificationsApp.css'

// Mock notifications
const mockNotifications = [
  {
    id: 1,
    type: 'info',
    title: 'System Update Available',
    message: 'A new system update is ready to install.',
    time: '2 minutes ago',
    read: false
  },
  {
    id: 2,
    type: 'success',
    title: 'Backup Complete',
    message: 'Your weekly backup has been completed successfully.',
    time: '1 hour ago',
    read: false
  },
  {
    id: 3,
    type: 'warning',
    title: 'High CPU Usage',
    message: 'Gaming PC is running at 92% CPU usage.',
    time: '3 hours ago',
    read: true
  },
  {
    id: 4,
    type: 'info',
    title: 'New Device Connected',
    message: 'Work Laptop has connected to the network.',
    time: 'Yesterday',
    read: true
  },
  {
    id: 5,
    type: 'error',
    title: 'Connection Lost',
    message: 'Lost connection to Home Server for 5 minutes.',
    time: 'Yesterday',
    read: true
  }
]

const typeIcons = {
  info: faInfoCircle,
  success: faCheckCircle,
  warning: faExclamationTriangle,
  error: faXmark
}

export default function NotificationsApp() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [filter, setFilter] = useState('all')

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  return (
    <div className="app-page notifications-app">
      <AppTopBar title="Notifications" />

      <div className="app-content">
        {/* Header Actions */}
        <div className="notifications-header">
          <div className="notifications-count">
            <FontAwesomeIcon icon={faBell} />
            <span>{unreadCount} unread</span>
          </div>
          <div className="notifications-actions">
            <button onClick={markAllAsRead} disabled={unreadCount === 0}>
              <FontAwesomeIcon icon={faCheck} />
              <span>Mark all read</span>
            </button>
            <button onClick={clearAll} disabled={notifications.length === 0}>
              <FontAwesomeIcon icon={faTrash} />
              <span>Clear all</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="notifications-filter">
          {['all', 'unread', 'read'].map(f => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="notifications-empty">
              <FontAwesomeIcon icon={faBellSlash} />
              <span>No notifications</span>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${notification.type} ${notification.read ? 'read' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className={`notification-icon ${notification.type}`}>
                  <FontAwesomeIcon icon={typeIcons[notification.type]} />
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h4>{notification.title}</h4>
                    {!notification.read && (
                      <FontAwesomeIcon icon={faCircle} className="unread-dot" />
                    )}
                  </div>
                  <p>{notification.message}</p>
                  <span className="notification-time">{notification.time}</span>
                </div>
                <button
                  className="notification-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNotification(notification.id)
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
