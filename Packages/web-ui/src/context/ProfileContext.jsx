/*
 * ProfileContext - User authentication and profile management
 * Handles login, logout, profile creation, and session persistence.
 * Uses localStorage to remember the last logged-in user per device.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useWebSocket } from './WebSocketContext'

const ProfileContext = createContext(null)
const STORAGE_KEY = 'homeSystem_profileId'

export function ProfileProvider({ children }) {
  const { connected, request } = useWebSocket()

  // Profile state
  const [profiles, setProfiles] = useState([])
  const [currentProfile, setCurrentProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Fetches all profiles from the server.
   * Called on connect and after profile changes.
   */
  const fetchProfiles = useCallback(async () => {
    if (!connected) return
    try {
      const result = await request('Profile/GetAll')
      // Server sends profiles in data.profiles
      const profiles = result?.data?.profiles
      if (profiles) {
        setProfiles(profiles)
      }
    } catch (err) {
      console.error('[Profile] Failed to fetch:', err)
    }
  }, [connected, request])

  /**
   * Restores session from localStorage if a valid profile is stored.
   * Auto-logs in without requiring passcode (device is trusted).
   */
  const tryAutoLogin = useCallback(async () => {
    if (!connected) return

    const storedProfileId = localStorage.getItem(STORAGE_KEY)
    if (!storedProfileId) {
      setIsLoading(false)
      return
    }

    try {
      const result = await request('Profile/GetAll')
      const profiles = result?.data?.profiles
      if (profiles) {
        setProfiles(profiles)
        const storedProfile = profiles.find(p => p.id === storedProfileId)

        if (storedProfile) {
          // Profile exists - restore session without passcode
          setCurrentProfile(storedProfile)
        } else {
          // Profile was deleted - clear stored ID
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (err) {
      console.error('[Profile] Auto-login failed:', err)
    }

    setIsLoading(false)
  }, [connected, request])

  /**
   * Authenticates user with profile ID and passcode.
   * Stores profile ID in localStorage on success.
   */
  const login = useCallback(async (profileId, passcode) => {
    setError(null)
    try {
      const result = await request('Profile/Login', { profileId, passcode })
      const success = result?.success || result?.data?.success
      const profile = result?.data?.profile
      const error = result?.error || result?.data?.error
      if (success && profile) {
        setCurrentProfile(profile)
        localStorage.setItem(STORAGE_KEY, profileId)
        return { success: true }
      } else {
        setError(error || 'Login failed')
        return { success: false, error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Login failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }, [request])

  /**
   * Logs out the current user and clears stored session.
   */
  const logout = useCallback(() => {
    setCurrentProfile(null)
    localStorage.removeItem(STORAGE_KEY)
    setError(null)
  }, [])

  /**
   * Creates a new profile and auto-logs in.
   */
  const createProfile = useCallback(async (name, passcode) => {
    setError(null)
    try {
      console.log('[Profile] Creating profile:', name)
      const result = await request('Profile/Create', { name, passcode })
      console.log('[Profile] Create result:', result)
      // Server sends success at top level, profile in data
      const success = result?.success || result?.data?.success
      const profile = result?.data?.profile
      const error = result?.error || result?.data?.error
      if (success && profile) {
        await fetchProfiles()
        setCurrentProfile(profile)
        localStorage.setItem(STORAGE_KEY, profile.id)
        return { success: true, profile }
      } else {
        console.log('[Profile] Create failed:', error)
        setError(error || 'Failed to create profile')
        return { success: false, error }
      }
    } catch (err) {
      console.error('[Profile] Create exception:', err)
      const errorMsg = err.message || 'Failed to create profile'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }, [request, fetchProfiles])

  /**
   * Updates a profile's name or passcode.
   */
  const updateProfile = useCallback(async (profileId, updates) => {
    setError(null)
    try {
      const result = await request('Profile/Update', { profileId, ...updates })
      const success = result?.success || result?.data?.success
      const profile = result?.data?.profile
      const error = result?.error || result?.data?.error
      if (success) {
        if (currentProfile?.id === profileId && profile) {
          setCurrentProfile(prev => ({ ...prev, ...profile }))
        }
        await fetchProfiles()
        return { success: true }
      }
      return { success: false, error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [request, currentProfile, fetchProfiles])

  /**
   * Deletes a profile. Logs out if deleting current user.
   */
  const deleteProfile = useCallback(async (profileId) => {
    try {
      const result = await request('Profile/Delete', { profileId })
      const success = result?.success || result?.data?.success
      const error = result?.error || result?.data?.error
      if (success) {
        if (currentProfile?.id === profileId) {
          logout()
        }
        await fetchProfiles()
        return { success: true }
      }
      return { success: false, error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [request, currentProfile, logout, fetchProfiles])

  // Check for stored session on connect
  useEffect(() => {
    if (connected) {
      tryAutoLogin()
    }
  }, [connected, tryAutoLogin])

  const storedProfileId = localStorage.getItem(STORAGE_KEY)

  const value = {
    profiles,
    currentProfile,
    isLoading,
    error,
    isLoggedIn: !!currentProfile,
    storedProfileId,
    login,
    logout,
    createProfile,
    updateProfile,
    deleteProfile,
    fetchProfiles,
    clearError: () => setError(null)
  }

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

/**
 * Hook to access profile context.
 * Must be used within a ProfileProvider.
 */
export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

export default ProfileContext
