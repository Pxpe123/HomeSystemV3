/*
 * SettingsApp - Application settings and user management
 * Profile management, display settings, and system configuration
 */

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser,
  faUsers,
  faPalette,
  faWifi,
  faBell,
  faShield,
  faCircleInfo,
  faChevronRight,
  faPlus,
  faTrash,
  faPen,
  faCheck,
  faXmark,
  faRightFromBracket
} from '@fortawesome/free-solid-svg-icons'
import { AppTopBar } from '../components'
import { useProfile, useWebSocket } from '../../../context'
import '../AppPage.css'
import './SettingsApp.css'

export default function SettingsApp() {
  const { currentProfile, profiles, logout, createProfile, deleteProfile } = useProfile()
  const { connected, serverUrl } = useWebSocket()
  const [activeSection, setActiveSection] = useState('profile')
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfilePasscode, setNewProfilePasscode] = useState('')

  const handleCreateProfile = async () => {
    if (newProfileName.trim()) {
      await createProfile(newProfileName.trim(), newProfilePasscode || null)
      setNewProfileName('')
      setNewProfilePasscode('')
      setShowCreateProfile(false)
    }
  }

  const handleDeleteProfile = async (profileId) => {
    if (profileId !== currentProfile?.id) {
      await deleteProfile(profileId)
    }
  }

  const handleLogout = () => {
    logout()
  }

  const sections = [
    { id: 'profile', icon: faUser, label: 'Profile' },
    { id: 'users', icon: faUsers, label: 'User Management' },
    { id: 'appearance', icon: faPalette, label: 'Appearance' },
    { id: 'connection', icon: faWifi, label: 'Connection' },
    { id: 'notifications', icon: faBell, label: 'Notifications' },
    { id: 'security', icon: faShield, label: 'Security' },
    { id: 'about', icon: faCircleInfo, label: 'About' }
  ]

  return (
    <div className="app-page settings-app">
      <AppTopBar title="Settings" />

      <div className="app-content settings-layout">
        {/* Section Navigation */}
        <div className="settings-nav">
          {sections.map(section => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <FontAwesomeIcon icon={section.icon} />
              <span>{section.label}</span>
              <FontAwesomeIcon icon={faChevronRight} className="nav-arrow" />
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="settings-content">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="settings-section">
              <h2>Profile</h2>

              <div className="profile-card">
                <div className="profile-avatar">
                  {currentProfile?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="profile-info">
                  <h3>{currentProfile?.name || 'Guest'}</h3>
                  <span className="profile-id">ID: {currentProfile?.id || 'N/A'}</span>
                </div>
              </div>

              <div className="settings-group">
                <h4>Linked Services</h4>
                <div className="setting-item">
                  <span>Spotify</span>
                  <span className={`status ${currentProfile?.spotifyProfileId ? 'linked' : ''}`}>
                    {currentProfile?.spotifyProfileId ? 'Linked' : 'Not linked'}
                  </span>
                </div>
              </div>

              <button className="logout-btn" onClick={handleLogout}>
                <FontAwesomeIcon icon={faRightFromBracket} />
                <span>Switch Profile</span>
              </button>
            </div>
          )}

          {/* User Management Section */}
          {activeSection === 'users' && (
            <div className="settings-section">
              <h2>User Management</h2>

              <div className="users-list">
                {profiles.map(profile => (
                  <div key={profile.id} className={`user-item ${profile.id === currentProfile?.id ? 'current' : ''}`}>
                    <div className="user-avatar">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{profile.name}</span>
                      {profile.id === currentProfile?.id && (
                        <span className="user-badge">Current</span>
                      )}
                    </div>
                    {profile.id !== currentProfile?.id && (
                      <button
                        className="user-delete"
                        onClick={() => handleDeleteProfile(profile.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {showCreateProfile ? (
                <div className="create-profile-form">
                  <input
                    type="text"
                    placeholder="Profile name"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="Passcode (optional)"
                    value={newProfilePasscode}
                    onChange={(e) => setNewProfilePasscode(e.target.value)}
                    maxLength={6}
                  />
                  <div className="form-actions">
                    <button className="btn-confirm" onClick={handleCreateProfile}>
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button className="btn-cancel" onClick={() => setShowCreateProfile(false)}>
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                </div>
              ) : (
                <button className="add-user-btn" onClick={() => setShowCreateProfile(true)}>
                  <FontAwesomeIcon icon={faPlus} />
                  <span>Add Profile</span>
                </button>
              )}
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>

              <div className="settings-group">
                <div className="setting-item">
                  <span>Theme</span>
                  <select defaultValue="dark">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="auto">System</option>
                  </select>
                </div>
                <div className="setting-item">
                  <span>Accent Color</span>
                  <div className="color-options">
                    <button className="color-option active" style={{ background: '#6366f1' }} />
                    <button className="color-option" style={{ background: '#8b5cf6' }} />
                    <button className="color-option" style={{ background: '#ec4899' }} />
                    <button className="color-option" style={{ background: '#14b8a6' }} />
                    <button className="color-option" style={{ background: '#f59e0b' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connection Section */}
          {activeSection === 'connection' && (
            <div className="settings-section">
              <h2>Connection</h2>

              <div className="settings-group">
                <div className="setting-item">
                  <span>Server Status</span>
                  <span className={`status ${connected ? 'connected' : 'disconnected'}`}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="setting-item">
                  <span>Server URL</span>
                  <span className="server-url">{serverUrl || 'Not configured'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h2>Notifications</h2>

              <div className="settings-group">
                <div className="setting-item">
                  <span>Enable Notifications</span>
                  <input type="checkbox" defaultChecked />
                </div>
                <div className="setting-item">
                  <span>Sound</span>
                  <input type="checkbox" defaultChecked />
                </div>
                <div className="setting-item">
                  <span>Vibration</span>
                  <input type="checkbox" />
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="settings-section">
              <h2>Security</h2>

              <div className="settings-group">
                <div className="setting-item">
                  <span>Require Passcode</span>
                  <input type="checkbox" defaultChecked={!!currentProfile?.hasPasscode} />
                </div>
                <div className="setting-item clickable">
                  <span>Change Passcode</span>
                  <FontAwesomeIcon icon={faChevronRight} />
                </div>
              </div>
            </div>
          )}

          {/* About Section */}
          {activeSection === 'about' && (
            <div className="settings-section">
              <h2>About</h2>

              <div className="settings-group">
                <div className="setting-item">
                  <span>Version</span>
                  <span>1.0.0</span>
                </div>
                <div className="setting-item">
                  <span>Build</span>
                  <span>2024.02.07</span>
                </div>
              </div>

              <div className="about-info">
                <h3>HomeSystem</h3>
                <p>A comprehensive home automation dashboard for managing smart devices, media, and more.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
