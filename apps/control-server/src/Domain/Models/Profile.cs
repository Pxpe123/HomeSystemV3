/*
 * Profile - User profile model for the home system
 * Each profile has a name, PIN passcode, and linked services.
 * Profiles are used to personalize the UI and store user preferences.
 */

namespace CentralServer.Modules.Data;

/// <summary>
/// Represents a user profile in the home system.
/// Stores authentication, linked accounts, and user preferences.
/// </summary>
public class Profile
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public string Passcode { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLogin { get; set; }

    // Linked external accounts
    public string? SpotifyProfileId { get; set; }

    // User-specific settings and preferences
    public ProfileSettings Settings { get; set; } = new();
}

/// <summary>
/// User-specific settings and layout preferences.
/// Designed to be easily extensible for future features.
/// </summary>
public class ProfileSettings
{
    public Dictionary<string, object> AppLayouts { get; set; } = new();
    public Dictionary<string, object> HomeAssistant { get; set; } = new();
}
