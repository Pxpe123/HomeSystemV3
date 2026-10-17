import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faUserPlus, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import './LoginScreen.css'

/**
 * Displays list of existing profiles for selection
 * Also shows "Create New User" option
 */
export default function ProfileSelector({
  profiles,
  onSelect,
  onCreate,
  storedProfileId
}) {
  const hasProfiles = profiles && profiles.length > 0

  return (
    <div className="profile-selector">
      <h2 className="selector-title">
        {hasProfiles ? 'Welcome Back' : 'Get Started'}
      </h2>
      <p className="selector-subtitle">
        {hasProfiles ? 'Select your profile to continue' : 'Create your first profile'}
      </p>

      {hasProfiles && (
        <div className="profile-list">
          {profiles.map(profile => (
            <button
              key={profile.id}
              className={`profile-item ${profile.id === storedProfileId ? 'last-used' : ''}`}
              onClick={() => onSelect(profile)}
            >
              <div className="profile-avatar">
                <FontAwesomeIcon icon={faUser} />
              </div>
              <div className="profile-info">
                <span className="profile-name">{profile.name}</span>
                {profile.id === storedProfileId && (
                  <span className="profile-badge">Last used</span>
                )}
              </div>
              <FontAwesomeIcon icon={faChevronRight} className="profile-arrow" />
            </button>
          ))}
        </div>
      )}

      <button className="create-user-button" onClick={onCreate}>
        <FontAwesomeIcon icon={faUserPlus} />
        <span>Create New User</span>
      </button>
    </div>
  )
}
