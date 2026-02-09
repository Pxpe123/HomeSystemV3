import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify } from '@fortawesome/free-brands-svg-icons'
import { faCircleCheck, faUser, faEnvelope, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import './Success.css'

export default function SpotifySuccess() {
  const [params] = useSearchParams()

  const name = params.get('name') ?? 'Unknown User'
  const email = params.get('email') ?? 'test@email.com'

  useEffect(() => {
    window.history.replaceState({}, '', '/Spotify/Callback/Success')
  }, [])

  return (
    <div className="spotify-callback">
      <div className="spotify-callback-card">
        {/* Header */}
        <div className="spotify-callback-header">
          <FontAwesomeIcon icon={faSpotify} className="spotify-icon" />
          <h1 className="header-title">Spotify</h1>
        </div>

        {/* Success Content */}
        <div className="spotify-callback-content">
          <div className="success-icon-wrapper">
            <FontAwesomeIcon icon={faCircleCheck} className="success-icon" />
          </div>

          <h2 className="success-title">Connected Successfully!</h2>
          <p className="success-subtitle">Your Spotify account has been linked</p>

          {/* Account Info */}
          <div className="account-info">
            <div className="account-info-row">
              <div className="info-icon">
                <FontAwesomeIcon icon={faUser} />
              </div>
              <div className="info-content">
                <span className="info-label">Name</span>
                <span className="info-value">{name}</span>
              </div>
            </div>

            {email && (
              <>
                <div className="account-info-divider" />
                <div className="account-info-row">
                  <div className="info-icon">
                    <FontAwesomeIcon icon={faEnvelope} />
                  </div>
                  <div className="info-content">
                    <span className="info-label">Email</span>
                    <span className="info-value">{email}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Close Message */}
          <div className="close-message">
            <FontAwesomeIcon icon={faInfoCircle} className="close-icon" />
            <span>You can now close this window and return to the app</span>
          </div>
        </div>
      </div>
    </div>
  )
}
