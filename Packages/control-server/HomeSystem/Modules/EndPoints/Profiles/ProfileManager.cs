/*
 * ProfileManager - User profile WebSocket endpoints
 * Handles all profile-related operations: create, login, update, delete.
 */

using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Messages;

namespace CentralServer.Modules.EndPoints.Profiles;

public static class ProfileManager
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static async Task Send(WebSocket socket, object payload)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);

        await socket.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );
    }

    private static async Task SendError(
        WebSocket socket,
        ClientMessage message,
        string type,
        string error
    )
    {
        await Send(socket, new
        {
            type,
            requestId = message.RequestId,
            success = false,
            error
        });
    }

    private static string GetString(object? data, string property)
    {
        if (data is JsonElement json &&
            json.TryGetProperty(property, out var value) &&
            value.ValueKind == JsonValueKind.String)
        {
            return value.GetString() ?? string.Empty;
        }

        return string.Empty;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GetProfiles
    // ─────────────────────────────────────────────────────────────────────────

    public static class GetProfiles
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profiles = Globals.Profiles.Values.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                createdAt = p.CreatedAt,
                lastLogin = p.LastLogin,
                hasSpotify = !string.IsNullOrEmpty(p.SpotifyProfileId)
            }).ToList();

            await Send(socket, new
            {
                type = "profile.getAll",
                requestId = message.RequestId,
                success = true,
                data = new
                {
                    profiles,
                    count = profiles.Count
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CreateProfile
    // ─────────────────────────────────────────────────────────────────────────

    public static class CreateProfile
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var name = GetString(message.Data, "name");
            var passcode = GetString(message.Data, "passcode");

            if (string.IsNullOrWhiteSpace(name))
            {
                await SendError(socket, message, "profile.create", "Name is required");
                return;
            }

            if (passcode.Length < 4 || passcode.Length > 6)
            {
                await SendError(socket, message, "profile.create", "Passcode must be 4–6 digits");
                return;
            }

            if (Globals.Profiles.Values.Any(p =>
                p.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            {
                await SendError(socket, message, "profile.create", "Profile name already exists");
                return;
            }

            var profile = new Profile
            {
                Id = Guid.NewGuid().ToString(),
                Name = name,
                Passcode = passcode,
                CreatedAt = DateTime.UtcNow,
                LastLogin = DateTime.UtcNow
            };

            Globals.Profiles[profile.Id] = profile;

            await Send(socket, new
            {
                type = "profile.create",
                requestId = message.RequestId,
                success = true,
                data = new
                {
                    profile = new
                    {
                        id = profile.Id,
                        name = profile.Name,
                        createdAt = profile.CreatedAt,
                        lastLogin = profile.LastLogin
                    }
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Login
    // ─────────────────────────────────────────────────────────────────────────

    public static class Login
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profileId = GetString(message.Data, "profileId");
            var passcode = GetString(message.Data, "passcode");

            if (!Globals.Profiles.TryGetValue(profileId, out var profile))
            {
                await SendError(socket, message, "profile.login", "Profile not found");
                return;
            }

            if (profile.Passcode != passcode)
            {
                await SendError(socket, message, "profile.login", "Incorrect passcode");
                return;
            }

            profile.LastLogin = DateTime.UtcNow;

            await Send(socket, new
            {
                type = "profile.login",
                requestId = message.RequestId,
                success = true,
                data = new
                {
                    profile = new
                    {
                        id = profile.Id,
                        name = profile.Name,
                        createdAt = profile.CreatedAt,
                        lastLogin = profile.LastLogin,
                        spotifyProfileId = profile.SpotifyProfileId,
                        settings = profile.Settings
                    }
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UpdateProfile
    // ─────────────────────────────────────────────────────────────────────────

    public static class UpdateProfile
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profileId = GetString(message.Data, "profileId");
            var newName = GetString(message.Data, "name");
            var newPasscode = GetString(message.Data, "passcode");

            if (!Globals.Profiles.TryGetValue(profileId, out var profile))
            {
                await SendError(socket, message, "profile.update", "Profile not found");
                return;
            }

            if (!string.IsNullOrWhiteSpace(newName))
            {
                if (Globals.Profiles.Values.Any(p =>
                    p.Id != profileId &&
                    p.Name.Equals(newName, StringComparison.OrdinalIgnoreCase)))
                {
                    await SendError(socket, message, "profile.update", "Name already in use");
                    return;
                }

                profile.Name = newName;
            }

            if (!string.IsNullOrWhiteSpace(newPasscode))
            {
                if (newPasscode.Length < 4 || newPasscode.Length > 6)
                {
                    await SendError(socket, message, "profile.update", "Passcode must be 4–6 digits");
                    return;
                }

                profile.Passcode = newPasscode;
            }

            await Send(socket, new
            {
                type = "profile.update",
                requestId = message.RequestId,
                success = true,
                data = new
                {
                    profile = new
                    {
                        id = profile.Id,
                        name = profile.Name,
                        createdAt = profile.CreatedAt,
                        lastLogin = profile.LastLogin
                    }
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DeleteProfile
    // ─────────────────────────────────────────────────────────────────────────

    public static class DeleteProfile
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profileId = GetString(message.Data, "profileId");

            if (!Globals.Profiles.Remove(profileId))
            {
                await SendError(socket, message, "profile.delete", "Profile not found");
                return;
            }

            await Send(socket, new
            {
                type = "profile.delete",
                requestId = message.RequestId,
                success = true
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LinkSpotify
    // ─────────────────────────────────────────────────────────────────────────

    public static class LinkSpotify
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profileId = GetString(message.Data, "profileId");
            var spotifyProfileId = GetString(message.Data, "spotifyProfileId");

            if (!Globals.Profiles.TryGetValue(profileId, out var profile))
            {
                await SendError(socket, message, "profile.linkSpotify", "Profile not found");
                return;
            }

            if (!string.IsNullOrEmpty(spotifyProfileId) &&
                !Globals.SpotifyProfiles.ContainsKey(spotifyProfileId))
            {
                await SendError(socket, message, "profile.linkSpotify", "Spotify profile not found");
                return;
            }

            profile.SpotifyProfileId =
                string.IsNullOrEmpty(spotifyProfileId) ? null : spotifyProfileId;

            await Send(socket, new
            {
                type = "profile.linkSpotify",
                requestId = message.RequestId,
                success = true,
                data = new
                {
                    spotifyProfileId = profile.SpotifyProfileId
                }
            });
        }
    }
}
