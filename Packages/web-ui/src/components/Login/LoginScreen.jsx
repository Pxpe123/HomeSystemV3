import { useState, useEffect } from 'react'
import { useProfile } from '../../context/ProfileContext'
import { useWebSocket } from '../../context/WebSocketContext'
import ProfileSelector from './ProfileSelector'
import Keypad from './Keypad'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import './LoginScreen.css'

/**
 * Full-screen login overlay
 * Handles profile selection, creation, and passcode entry
 */
export default function LoginScreen() {
  const { connected } = useWebSocket()
  const {
    profiles,
    isLoading,
    error,
    storedProfileId,
    login,
    createProfile,
    fetchProfiles,
    clearError
  } = useProfile()

  const [view, setView] = useState('select') // 'select' | 'login' | 'create' | 'createPasscode'
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [newUserName, setNewUserName] = useState('')
  const [nameError, setNameError] = useState('')

  // Fetch profiles when connected
  useEffect(() => {
    if (connected) {
      fetchProfiles()
    }
  }, [connected, fetchProfiles])

  // Handle profile selection
  const handleSelectProfile = (profile) => {
    setSelectedProfile(profile)
    clearError()
    setView('login')
  }

  // Handle login attempt
  const handleLogin = async (passcode) => {
    const result = await login(selectedProfile.id, passcode)
    if (!result.success) {
      // Error is handled by context, keypad will shake
    }
  }

  // Handle create user button
  const handleCreateClick = () => {
    setNewUserName('')
    setNameError('')
    clearError()
    setView('create')
  }

  // Handle name submission
  const handleNameSubmit = (e) => {
    e.preventDefault()
    const trimmedName = newUserName.trim()

    if (!trimmedName) {
      setNameError('Please enter a name')
      return
    }

    if (trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters')
      return
    }

    if (profiles.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setNameError('This name is already taken')
      return
    }

    setNameError('')
    setView('createPasscode')
  }

  // Handle new user creation with passcode
  const handleCreatePasscode = async (passcode) => {
    const result = await createProfile(newUserName.trim(), passcode)
    if (!result.success) {
      // Error is handled by context
      setView('create')
    }
  }

  // Handle back button
  const handleBack = () => {
    clearError()
    if (view === 'createPasscode') {
      setView('create')
    } else {
      setView('select')
      setSelectedProfile(null)
      setNewUserName('')
    }
  }

  // Loading state
  if (isLoading || !connected) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-loading">
            <div className="loading-spinner" />
            <span>{connected ? 'Loading...' : 'Connecting...'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        {view !== 'select' && (
          <button className="login-back" onClick={handleBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        )}

        {view === 'select' && (
          <ProfileSelector
            profiles={profiles}
            onSelect={handleSelectProfile}
            onCreate={handleCreateClick}
            storedProfileId={storedProfileId}
          />
        )}

        {view === 'login' && selectedProfile && (
          <div className="login-keypad-view">
            <div className="login-user-header">
              <span className="login-greeting">Hello,</span>
              <span className="login-username">{selectedProfile.name}</span>
            </div>
            <Keypad
              onSubmit={handleLogin}
              error={error}
              title="Enter your passcode"
            />
          </div>
        )}

        {view === 'create' && (
          <div className="create-user-view">
            <h2 className="create-title">Create Profile</h2>
            <p className="create-subtitle">Enter your name to get started</p>

            <form onSubmit={handleNameSubmit} className="create-form">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => {
                  setNewUserName(e.target.value)
                  setNameError('')
                }}
                placeholder="Your name"
                className={`create-input ${nameError ? 'error' : ''}`}
                autoFocus
                maxLength={20}
              />
              {nameError && (
                <span className="create-error">{nameError}</span>
              )}
              <button type="submit" className="create-submit">
                Continue
              </button>
            </form>
          </div>
        )}

        {view === 'createPasscode' && (
          <div className="login-keypad-view">
            <div className="login-user-header">
              <span className="login-greeting">Welcome,</span>
              <span className="login-username">{newUserName}</span>
            </div>
            <Keypad
              onSubmit={handleCreatePasscode}
              error={error}
              title="Create a passcode"
              confirmMode={true}
              confirmTitle="Confirm passcode"
            />
          </div>
        )}
      </div>
    </div>
  )
}
