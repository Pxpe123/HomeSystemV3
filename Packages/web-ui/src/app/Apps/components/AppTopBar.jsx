/*
 * AppTopBar - Shared top bar for full-screen app pages
 * Shows back button, title, and current time
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import './AppTopBar.css'

export default function AppTopBar({ title }) {
  const navigate = useNavigate()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="app-top-bar">
      <button className="app-back-button" onClick={() => navigate('/')}>
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>
      <h1 className="app-title">{title}</h1>
      <span className="app-time">{formatTime(time)}</span>
    </div>
  )
}
