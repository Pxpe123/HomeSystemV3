/*
 * ProfileManager - User profile WebSocket endpoints
 * Handles all profile-related operations: create, login, update, delete.
 * Profiles are used for personalization and linked account management.
 */

using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Messages;

namespace CentralServer.Modules.EndPoints.Profiles;

public class ProfileManager
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Sends a JSON response to the client.
    /// </summary>
    private static async Task SendResponse(WebSocket socket, object response)
    {
        var json = JsonSerializer.Serialize(response, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        await socket.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );
    }

    /// <summary>
    /// Extracts a string property from JsonElement data.
    /// </summary>
    private static string GetString(object? data, string property)
    {
        if (data is JsonElement json && json.TryGetProperty(property, out var value))
            return value.GetString() ?? "";
        return "";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GetProfiles - Returns all profiles (without passcodes)
    // ─────────────────────────────────────────────────────────────────────────

    public class GetProfiles
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profiles = Globals.Profiles.Values.Select(p => new
            {
                p.Id,
                p.Name,
                p.CreatedAt,
                p.LastLogin,
                HasSpotify = !string.IsNullOrEmpty(p.SpotifyProfileId)
            }).ToList();

            await SendResponse(socket, new
            {
                Type = "Profile/GetAll",
                RequestId = message.RequestId,
                Data = new { Profiles = profiles, Count = profiles.Count }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CreateProfile - Creates a new user profile
    // ─────────────────────────────────────────────────────────────────────────

    public class CreateProfile
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var name = GetString(message.Data, "name");
            var passcode = GetString(message.Data, "passcode");

            // Validate name
            if (string.IsNullOrWhiteSpace(name))
            {
                await SendError(socket, message, "Name is required");
                return;
            }

            // Validate passcode length
            if (string.IsNullOrWhiteSpace(passcode) || passcode.Length < 4 || passcode.Length > 6)
            {
                await SendError(socket, message, "Passcode must be 4-6 digits");
                return;
            }

            // Check for duplicate names
            if (Globals.Profiles.Values.Any(p => p.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            {
                await SendError(socket, message, "A profile with this name already exists");
                return;
            }

            // Create and store the profile
            var profile = new Profile
            {
                Name = name,
                Passcode = passcode,
                LastLogin = DateTime.UtcNow
            };
            Globals.Profiles[profile.Id] = profile;

            Console.WriteLine($"[Profile] Created: {name}");

            await SendResponse(socket, new
            {
                Type = "Profile/Create",
                RequestId = message.RequestId,
                Data = new
                {
                    Success = true,
                    Profile = new { profile.Id, profile.Name, profile.CreatedAt, profile.LastLogin }
                }
            });
        }

        private static async Task SendError(WebSocket socket, ClientMessage message, string error)
        {
            await SendResponse(socket, new
            {
                Type = "Profile/Create",
                RequestId = message.RequestId,
                Data = new { Success = false, Error = error }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Login - Authenticates user with passcode
    // ─────────────────────────────────────────────────────────────────────────

    public class Login
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profileId = GetString(message.Data, "profileId");
            var passcode = GetString(message.Data, "passcode");

            // Find the profile
            if (!Globals.Profiles.TryGetValue(profileId, out var profile))
            {
                await SendError(socket, message, "Profile not found");
                return;
            }

            // Verify passcode
            if (profile.Passcode != passcode)
            {
                Console.WriteLine($"[Profile] Failed login: {profile.Name}");
                await SendError(socket, message, "Incorrect passcode");
                return;
            }

            // Update last login timestamp
            profile.LastLogin = DateTime.UtcNow;
            Console.WriteLine($"[Profile] Login: {profile.Name}");

            await SendResponse(socket, new
            {
                Type = "Profile/Login",
                RequestId = message.RequestId,
                Data = new
                {
                    Success = true,
                    Profile = new
                    {
                        profile.Id,
                        profile.Name,
                        profile.CreatedAt,
                        profile.LastLogin,
                        profile.SpotifyProfileId,
                        profile.Settings
                    }
                }
            });
        }

        private static async Task SendError(WebSocket socket, ClientMessage message, string error)
        {
            await SendResponse(socket, new
            {
                Type = "Profile/Login",
                RequestId = message.RequestId,
                Data = new { Success = false, Error = error }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UpdateProfile - Updates profile name or passcode
    // ─────────────────────────────────────────────────────────────────────────

    public class UpdateProfile
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profileId = GetString(message.Data, "profileId");
            var newName = GetString(message.Data, "name");
            var newPasscode = GetString(message.Data, "passcode");

            // Find the profile
            if (!Globals.Profiles.TryGetValue(profileId, out var profile))
            {
                await SendError(socket, message, "Profile not found");
                return;
            }

            // Update name if provided
            if (!string.IsNullOrWhiteSpace(newName))
            {
                var nameExists = Globals.Profiles.Values
                    .Any(p => p.Id != profileId && p.Name.Equals(newName, StringComparison.OrdinalIgnoreCase));

                if (nameExists)
                {
                    await SendError(socket, message, "A profile with this name already exists");
                    return;
                }
                profile.Name = newName;
            }

            // Update passcode if provided
            if (!string.IsNullOrWhiteSpace(newPasscode))
            {
                if (newPasscode.Length < 4 || newPasscode.Length > 6)
                {
                    await SendError(socket, message, "Passcode must be 4-6 digits");
                    return;
                }
                profile.Passcode = newPasscode;
            }

            Console.WriteLine($"[Profile] Updated: {profile.Name}");

            await SendResponse(socket, new
            {
                Type = "Profile/Update",
                RequestId = message.RequestId,
                Data = new
                {
                    Success = true,
                    Profile = new { profile.Id, profile.Name, profile.CreatedAt, profile.LastLogin }
                }
            });
        }

        private static async Task SendError(WebSocket socket, ClientMessage message, string error)
        {
            await SendResponse(socket, new
            {
                Type = "Profile/Update",
                RequestId = message.RequestId,
                Data = new { Success = false, Error = error }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DeleteProfile - Removes a profile
    // ─────────────────────────────────────────────────────────────────────────

    public class DeleteProfile
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profileId = GetString(message.Data, "profileId");

            if (!Globals.Profiles.TryGetValue(profileId, out var profile))
            {
                await SendResponse(socket, new
                {
                    Type = "Profile/Delete",
                    RequestId = message.RequestId,
                    Data = new { Success = false, Error = "Profile not found" }
                });
                return;
            }

            Globals.Profiles.Remove(profileId);
            Console.WriteLine($"[Profile] Deleted: {profile.Name}");

            await SendResponse(socket, new
            {
                Type = "Profile/Delete",
                RequestId = message.RequestId,
                Data = new { Success = true }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LinkSpotify - Links/unlinks Spotify account to profile
    // ─────────────────────────────────────────────────────────────────────────

    public class LinkSpotify
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profileId = GetString(message.Data, "profileId");
            var spotifyProfileId = GetString(message.Data, "spotifyProfileId");

            if (!Globals.Profiles.TryGetValue(profileId, out var profile))
            {
                await SendError(socket, message, "Profile not found");
                return;
            }

            // Verify Spotify profile exists (if linking)
            if (!string.IsNullOrEmpty(spotifyProfileId) && !Globals.SpotifyProfiles.ContainsKey(spotifyProfileId))
            {
                await SendError(socket, message, "Spotify profile not found");
                return;
            }

            // Link or unlink
            profile.SpotifyProfileId = string.IsNullOrEmpty(spotifyProfileId) ? null : spotifyProfileId;
            var action = string.IsNullOrEmpty(spotifyProfileId) ? "Unlinked" : "Linked";
            Console.WriteLine($"[Profile] {action} Spotify: {profile.Name}");

            await SendResponse(socket, new
            {
                Type = "Profile/LinkSpotify",
                RequestId = message.RequestId,
                Data = new { Success = true, SpotifyProfileId = profile.SpotifyProfileId }
            });
        }

        private static async Task SendError(WebSocket socket, ClientMessage message, string error)
        {
            await SendResponse(socket, new
            {
                Type = "Profile/LinkSpotify",
                RequestId = message.RequestId,
                Data = new { Success = false, Error = error }
            });
        }
    }
}
