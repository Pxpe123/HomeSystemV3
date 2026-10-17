using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Messages;
using QRCoder;
using SpotifyAPI.Web;

namespace CentralServer.Modules.EndPoints.Spotify;

public class SpotifyManager
{
    public static readonly string ClientId =
        Environment.GetEnvironmentVariable("SpotifyClientID") ?? "19ea12f634f048468ed4f59a69bf6a2b";

    public static readonly string ClientSecret =
        Environment.GetEnvironmentVariable("SpotifyClientSecret") ?? "853f6ae8fcb14e32afc557b04e200195";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    // Cached SpotifyClient per profile to avoid recreating on every call
    private static readonly ConcurrentDictionary<string, SpotifyClient> _clients = new();

    private static SpotifyClient GetClient(SpotifyProfile profile)
    {
        // Recreate client if token changed
        if (_clients.TryGetValue(profile.Id, out var existing))
            return existing;

        var client = new SpotifyClient(profile.AccessToken);
        _clients[profile.Id] = client;
        return client;
    }

    // Call after token refresh to invalidate cached client
    private static void InvalidateClient(string profileId)
    {
        _clients.TryRemove(profileId, out _);
    }

    public class Login
    {
        private static readonly ConcurrentDictionary<string, WebSocket> PendingSockets = new();

        public static readonly string RedirectUri =
            "https://jay.cpope.uk/Spotify/Callback";

        public static void RegisterCallbackEndpoint()
        {
            Globals.App.MapGet("/Spotify/Callback", async ctx =>
            {
                var code = ctx.Request.Query["code"].ToString();
                var state = ctx.Request.Query["state"].ToString();

                if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state) ||
                    !PendingSockets.TryRemove(state, out var socket))
                {
                    await ctx.Response.WriteAsync("Invalid login session.");
                    return;
                }

                try
                {
                    var config = SpotifyClientConfig.CreateDefault();
                    var oAuthClient = new OAuthClient(config);

                    var tokenRequest = new AuthorizationCodeTokenRequest(
                        ClientId, ClientSecret, code, new Uri(RedirectUri)
                    );

                    var tokenResponse = await oAuthClient.RequestToken(tokenRequest);

                    var spotify = new SpotifyClient(tokenResponse.AccessToken);
                    var me = await spotify.UserProfile.Current();

                    var profile = new SpotifyProfile
                    {
                        Id = me.Id ?? "",
                        DisplayName = me.DisplayName ?? "",
                        Email = me.Email ?? "",
                        AccessToken = tokenResponse.AccessToken,
                        RefreshToken = tokenResponse.RefreshToken
                    };
                    Globals.SpotifyProfiles[profile.Id] = profile;
                    InvalidateClient(profile.Id);

                    Console.WriteLine($"[Spotify] {profile.DisplayName} logged in");

                    string webUiUrl =
                        $"{Globals.WebUiUrl}Spotify/Callback/Success" +
                        $"?name={Uri.EscapeDataString(profile.DisplayName)}" +
                        $"&email={Uri.EscapeDataString(profile.Email)}";
                    ctx.Response.Redirect(webUiUrl);
                    
                    Console.WriteLine("Generated URL: " + webUiUrl);

                    if (socket.State == WebSocketState.Open)
                    {
                        var payload = new
                        {
                            Type = "Spotify/LoginResult",
                            DisplayName = profile.DisplayName,
                            UserId = profile.Id
                        };
                        var json = JsonSerializer.Serialize(payload, JsonOptions);
                        var bytes = Encoding.UTF8.GetBytes(json);
                        await socket.SendAsync(new ArraySegment<byte>(bytes),
                            WebSocketMessageType.Text, true, CancellationToken.None);
                    }

                    // Start background services if not already running
                    StateUpdater.EnsureRunning();
                    TokenRefresher.EnsureRunning();
                }
                catch (APIException ex)
                {
                    await ctx.Response.WriteAsync($"Token exchange failed: {ex.Message}");
                }
            });
        }

        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var state = Guid.NewGuid().ToString();
            PendingSockets[state] = socket;

            var loginRequest = new LoginRequest(
                new Uri(RedirectUri),
                ClientId,
                LoginRequest.ResponseType.Code
            )
            {
                Scope = new[]
                {
                    Scopes.UserReadPrivate,
                    Scopes.UserReadEmail,
                    Scopes.UserReadPlaybackState,
                    Scopes.UserModifyPlaybackState,
                    Scopes.PlaylistReadPrivate,
                    Scopes.PlaylistReadCollaborative
                },
                State = state
            };

            var loginUrl = loginRequest.ToUri().ToString();

            // Generate QR code as base64 PNG
            using var qrGenerator = new QRCodeGenerator();
            using var qrCodeData = qrGenerator.CreateQrCode(loginUrl, QRCodeGenerator.ECCLevel.M);
            using var qrCode = new PngByteQRCode(qrCodeData);
            var qrBytes = qrCode.GetGraphic(10, new byte[] { 255, 255, 255 }, new byte[] { 30, 30, 30 });
            var qrBase64 = Convert.ToBase64String(qrBytes);

            var response = new
            {
                Type = "Spotify/Login",
                message.RequestId,
                Data = new
                {
                    LoginUrl = loginUrl,
                    QrCode = $"data:image/png;base64,{qrBase64}"
                }
            };

            var json = JsonSerializer.Serialize(response, JsonOptions);
            var bytes = Encoding.UTF8.GetBytes(json);
            await socket.SendAsync(new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    public static class TokenRefresher
    {
        private static bool _running;
        private static readonly object _lock = new();

        public static void EnsureRunning()
        {
            lock (_lock)
            {
                if (_running) return;
                _running = true;
            }

            _ = Task.Run(async () =>
            {
                while (true)
                {
                    await Task.Delay(TimeSpan.FromMinutes(30));
                    await RefreshAllProfiles();
                }
            });

            Console.WriteLine("[Spotify] Token refresher started");
        }

        private static async Task RefreshAllProfiles()
        {
            if (Globals.SpotifyProfiles.Count == 0) return;

            var config = SpotifyClientConfig.CreateDefault();
            var oAuthClient = new OAuthClient(config);

            foreach (var profile in Globals.SpotifyProfiles.Values)
            {
                if (string.IsNullOrEmpty(profile.RefreshToken)) continue;

                try
                {
                    var request = new AuthorizationCodeRefreshRequest(ClientId, ClientSecret, profile.RefreshToken);
                    var response = await oAuthClient.RequestToken(request);

                    profile.AccessToken = response.AccessToken;
                    if (!string.IsNullOrEmpty(response.RefreshToken))
                        profile.RefreshToken = response.RefreshToken;

                    InvalidateClient(profile.Id);

                    if (Globals.DevMode)
                        Console.WriteLine($"[Spotify] Refreshed token for {profile.DisplayName}");
                }
                catch (APIException ex)
                {
                    Console.WriteLine($"[Spotify] Token refresh failed for {profile.DisplayName}: {ex.Message}");
                }
            }
        }
    }

    public static class StateUpdater
    {
        private static bool _running;
        private static readonly object _lock = new();

        public static void EnsureRunning()
        {
            lock (_lock)
            {
                if (_running) return;
                _running = true;
            }

            // Playback & Queue (every 5s)
            _ = Task.Run(async () =>
            {
                while (true)
                {
                    await Task.Delay(TimeSpan.FromSeconds(5));
                    await UpdatePlaybackForAll();
                }
            });

            // Devices (every 30s)
            _ = Task.Run(async () =>
            {
                while (true)
                {
                    await Task.Delay(TimeSpan.FromSeconds(30));
                    await UpdateDevicesForAll();
                }
            });

            // Playlists (every 5m)
            _ = Task.Run(async () =>
            {
                while (true)
                {
                    await Task.Delay(TimeSpan.FromMinutes(5));
                    await UpdatePlaylistsForAll();
                }
            });

            Console.WriteLine("[Spotify] State updater started");
        }

        private static async Task UpdatePlaybackForAll()
        {
            foreach (var profile in Globals.SpotifyProfiles.Values)
            {
                if (string.IsNullOrEmpty(profile.AccessToken)) continue;

                try
                {
                    var spotify = GetClient(profile);
                    var playback = await spotify.Player.GetCurrentPlayback();

                    if (playback?.Item is FullTrack track)
                    {
                        var queueResponse = await spotify.Player.GetQueue();

                        profile.CurrentPlayback = new SpotifyProfile.PlaybackInfo
                        {
                            SongId = track.Id ?? "",
                            SongName = track.Name ?? "",
                            ArtistName = track.Artists != null
                                ? string.Join(", ", track.Artists.Select(a => a.Name))
                                : "",
                            SongImage = track.Album?.Images?.FirstOrDefault()?.Url ?? "",
                            PlaybackState = playback.IsPlaying,
                            ActiveDevice = playback.Device?.Name ?? "",
                            PlaylistId = playback.Context?.Uri?.Replace("spotify:playlist:", "") ?? "",
                            ProgressMs = playback.ProgressMs,
                            DurationMs = track.DurationMs,
                            ShuffleState = playback.ShuffleState,
                            RepeatState = playback.RepeatState ?? "off",
                            Queue = queueResponse?.Queue?
                                .OfType<FullTrack>()
                                .Select(q => new SpotifyProfile.PlaybackInfo.QueueItem
                                {
                                    SongId = q.Id ?? "",
                                    SongName = q.Name ?? "",
                                    ArtistName = q.Artists != null
                                        ? string.Join(", ", q.Artists.Select(a => a.Name))
                                        : "",
                                    SongImage = q.Album?.Images?.FirstOrDefault()?.Url ?? "",
                                    DurationMs = q.DurationMs
                                }).ToList() ?? new()
                        };

                        profile.LastActive = DateTime.UtcNow;
                    }
                    else if (playback == null)
                    {
                        // Nothing playing - keep last known state but mark as paused
                        if (profile.CurrentPlayback != null)
                            profile.CurrentPlayback.PlaybackState = false;
                    }
                }
                catch (APIException) { }
            }
        }

        private static async Task UpdateDevicesForAll()
        {
            foreach (var profile in Globals.SpotifyProfiles.Values)
            {
                if (string.IsNullOrEmpty(profile.AccessToken)) continue;

                try
                {
                    var spotify = GetClient(profile);
                    var devices = await spotify.Player.GetAvailableDevices();
                    profile.Devices = devices?.Devices?.Select(d => new SpotifyProfile.DeviceInfo
                    {
                        Id = d.Id,
                        Name = d.Name,
                        IsActive = d.IsActive,
                        Type = d.Type,
                        VolumePercent = d.VolumePercent ?? 0
                    }).ToList() ?? new();
                }
                catch (APIException) { }
            }
        }

        private static async Task UpdatePlaylistsForAll()
        {
            foreach (var profile in Globals.SpotifyProfiles.Values)
            {
                if (string.IsNullOrEmpty(profile.AccessToken)) continue;

                try
                {
                    var spotify = GetClient(profile);
                    var playlists = await spotify.Playlists.GetUsers(profile.Id);
                    profile.Playlists = playlists.Items?.Select(p => new SpotifyProfile.UserPlaylist
                    {
                        Id = p.Id ?? "",
                        Name = p.Name ?? ""
                    }).ToList() ?? new();
                    profile.ActivePlaylistId = profile.CurrentPlayback?.PlaylistId;
                }
                catch (APIException) { }
            }
        }
    }

    // === WebSocket Endpoints ===

    public class GetProfiles
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var profiles = Globals.SpotifyProfiles.Values.Select(p => new
            {
                p.Id,
                p.DisplayName,
                p.Email,
                IsPlaying = p.CurrentPlayback?.PlaybackState ?? false,
                p.LastActive
            });

            var response = new { Type = "Spotify/GetProfiles", message.RequestId, Data = profiles };
            var json = JsonSerializer.Serialize(response, JsonOptions);
            await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(json)),
                WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    public class GetState
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var userId = message.Data.TryGetProperty("userId", out var uid) ? uid.GetString() : null;

            if (string.IsNullOrEmpty(userId) || !Globals.SpotifyProfiles.TryGetValue(userId, out var profile))
            {
                var err = new { Type = "Spotify/GetState", message.RequestId, Error = "Profile not found" };
                var errJson = JsonSerializer.Serialize(err, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(errJson)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
                return;
            }

            var response = new
            {
                Type = "Spotify/GetState",
                message.RequestId,
                Data = new
                {
                    profile.Id,
                    profile.DisplayName,
                    Playback = profile.CurrentPlayback,
                    profile.Devices,
                    profile.Playlists,
                    profile.ActivePlaylistId,
                    profile.LastActive
                }
            };

            var json = JsonSerializer.Serialize(response, JsonOptions);
            await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(json)),
                WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    public class GetAllStates
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var states = Globals.SpotifyProfiles.Values.Select(p => new
            {
                p.Id,
                p.DisplayName,
                Playback = p.CurrentPlayback,
                p.Devices,
                p.Playlists,
                p.ActivePlaylistId,
                p.LastActive
            });

            var response = new { Type = "Spotify/GetAllStates", message.RequestId, Data = states };
            var json = JsonSerializer.Serialize(response, JsonOptions);
            await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(json)),
                WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    public class PlaybackControl
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var userId = message.Data.TryGetProperty("userId", out var uid) ? uid.GetString() : null;
            var action = message.Data.TryGetProperty("action", out var act) ? act.GetString() : null;

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(action) ||
                !Globals.SpotifyProfiles.TryGetValue(userId, out var profile))
            {
                var err = new { Type = "Spotify/Playback", message.RequestId, Error = "Invalid userId or action" };
                var errJson = JsonSerializer.Serialize(err, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(errJson)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
                return;
            }

            var spotify = GetClient(profile);
            var success = true;
            var errorMsg = "";

            try
            {
                switch (action.ToLower())
                {
                    case "play": await spotify.Player.ResumePlayback(); break;
                    case "pause": await spotify.Player.PausePlayback(); break;
                    case "next": await spotify.Player.SkipNext(); break;
                    case "previous": await spotify.Player.SkipPrevious(); break;
                    case "shuffle":
                        var shuffleVal = message.Data.TryGetProperty("value", out var sv) && sv.GetBoolean();
                        await spotify.Player.SetShuffle(new PlayerShuffleRequest(shuffleVal));
                        break;
                    case "repeat":
                        var repeatMode = message.Data.TryGetProperty("state", out var rm) ? rm.GetString() : "off";
                        var repeatState = repeatMode switch
                        {
                            "track" => PlayerSetRepeatRequest.State.Track,
                            "context" => PlayerSetRepeatRequest.State.Context,
                            _ => PlayerSetRepeatRequest.State.Off
                        };
                        await spotify.Player.SetRepeat(new PlayerSetRepeatRequest(repeatState));
                        break;
                    case "transfer":
                        var deviceId = message.Data.TryGetProperty("deviceId", out var di) ? di.GetString() : null;
                        if (string.IsNullOrEmpty(deviceId)) { success = false; errorMsg = "deviceId required"; break; }
                        await spotify.Player.TransferPlayback(new PlayerTransferPlaybackRequest(new List<string> { deviceId }) { Play = true });
                        break;
                    case "playuri":
                        var uri = message.Data.TryGetProperty("uri", out var u) ? u.GetString() : null;
                        if (string.IsNullOrEmpty(uri)) { success = false; errorMsg = "uri required"; break; }
                        await spotify.Player.ResumePlayback(new PlayerResumePlaybackRequest { Uris = new List<string> { uri } });
                        break;
                    case "playcontext":
                        var contextUri = message.Data.TryGetProperty("contextUri", out var cu) ? cu.GetString() : null;
                        if (string.IsNullOrEmpty(contextUri)) { success = false; errorMsg = "contextUri required"; break; }
                        await spotify.Player.ResumePlayback(new PlayerResumePlaybackRequest { ContextUri = contextUri });
                        break;
                    default:
                        success = false;
                        errorMsg = $"Unknown action: {action}";
                        break;
                }

                if (success)
                {
                    profile.LastActive = DateTime.UtcNow;
                    if (Globals.DevMode)
                        Console.WriteLine($"[Spotify] {action} for {profile.DisplayName}");
                }
            }
            catch (APIException ex)
            {
                success = false;
                errorMsg = ex.Message;
                Console.WriteLine($"[Spotify] {action} failed for {profile.DisplayName}: {ex.Message}");
            }

            var response = new
            {
                Type = "Spotify/Playback",
                message.RequestId,
                Data = new { Success = success, Action = action, Error = errorMsg }
            };
            var json = JsonSerializer.Serialize(response, JsonOptions);
            await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(json)),
                WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    public class Search
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var userId = message.Data.TryGetProperty("userId", out var uid) ? uid.GetString() : null;
            var query = message.Data.TryGetProperty("query", out var q) ? q.GetString() : null;

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(query) ||
                !Globals.SpotifyProfiles.TryGetValue(userId, out var profile))
            {
                var err = new { Type = "Spotify/Search", message.RequestId, Error = "Invalid userId or query" };
                var errJson = JsonSerializer.Serialize(err, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(errJson)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
                return;
            }

            try
            {
                var spotify = GetClient(profile);
                var searchRequest = new SearchRequest(SearchRequest.Types.Track, query) { Limit = 20 };
                var result = await spotify.Search.Item(searchRequest);

                var tracks = result.Tracks?.Items?.Select(t => new
                {
                    Id = t.Id ?? "",
                    Name = t.Name ?? "",
                    ArtistName = t.Artists != null ? string.Join(", ", t.Artists.Select(a => a.Name)) : "",
                    Uri = t.Uri ?? "",
                    DurationMs = t.DurationMs,
                    ImageUrl = t.Album?.Images?.FirstOrDefault()?.Url ?? ""
                });

                var response = new
                {
                    Type = "Spotify/Search",
                    message.RequestId,
                    Data = new { Tracks = tracks }
                };
                var json = JsonSerializer.Serialize(response, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(json)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch (APIException ex)
            {
                var err = new { Type = "Spotify/Search", message.RequestId, Error = ex.Message };
                var errJson = JsonSerializer.Serialize(err, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(errJson)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
    }

    public class GetPlaylistTracks
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var userId = message.Data.TryGetProperty("userId", out var uid) ? uid.GetString() : null;
            var playlistId = message.Data.TryGetProperty("playlistId", out var pi) ? pi.GetString() : null;

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(playlistId) ||
                !Globals.SpotifyProfiles.TryGetValue(userId, out var profile))
            {
                var err = new { Type = "Spotify/GetPlaylistTracks", message.RequestId, Error = "Invalid userId or playlistId" };
                var errJson = JsonSerializer.Serialize(err, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(errJson)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
                return;
            }

            try
            {
                var spotify = GetClient(profile);
                var items = await spotify.Playlists.GetItems(playlistId);

                var tracks = items.Items?
                    .Where(item => item.Track is FullTrack)
                    .Select(item =>
                    {
                        var t = (FullTrack)item.Track;
                        return new
                        {
                            Id = t.Id ?? "",
                            Name = t.Name ?? "",
                            ArtistName = t.Artists != null ? string.Join(", ", t.Artists.Select(a => a.Name)) : "",
                            Uri = t.Uri ?? "",
                            DurationMs = t.DurationMs,
                            ImageUrl = t.Album?.Images?.FirstOrDefault()?.Url ?? ""
                        };
                    });

                var response = new
                {
                    Type = "Spotify/GetPlaylistTracks",
                    message.RequestId,
                    Data = new { Tracks = tracks }
                };
                var json = JsonSerializer.Serialize(response, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(json)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch (APIException ex)
            {
                var err = new { Type = "Spotify/GetPlaylistTracks", message.RequestId, Error = ex.Message };
                var errJson = JsonSerializer.Serialize(err, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(errJson)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
    }
}
