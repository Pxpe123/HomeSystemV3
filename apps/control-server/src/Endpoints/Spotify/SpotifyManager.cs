using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Messages;
using QRCoder;
using SpotifyAPI.Web;
using CentralServer.Persistence;
using System.Security.Cryptography;

namespace CentralServer.Modules.EndPoints.Spotify;

public class SpotifyManager
{
    private static void LogSpotifyError(string operation, Exception ex)
    {
        // Provider exception bodies can contain credentials; log the operation and type only.
        Console.Error.WriteLine($"[Spotify] {operation} failed ({ex.GetType().Name}).");
    }

    private static string ClientId => Environment.GetEnvironmentVariable("SpotifyClientID") ?? "";

    private static string ClientSecret => Environment.GetEnvironmentVariable("SpotifyClientSecret") ?? "";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    // Cached SpotifyClient per profile to avoid recreating on every call
    private static readonly ConcurrentDictionary<string, (string Token, SpotifyClient Client)> _clients = new();
    private static readonly Lazy<SpotifyTokenService> _tokens = new(() => new(AccountRepository.Current, SpotifyTokenService.RefreshFromSpotify));

    private static async Task<SpotifyClient> GetClient(SpotifyProfile profile)
    {
        // Recreate client if token changed
        var token = await _tokens.Value.GetAccessTokenAsync(profile.Id);
        if (_clients.TryGetValue(profile.Id, out var existing) && existing.Token == token)
            return existing.Client;

        var client = new SpotifyClient(token);
        _clients[profile.Id] = (token, client);
        return client;
    }

    // Call after token refresh to invalidate cached client
    private static void InvalidateClient(string profileId)
    {
        _clients.TryRemove(profileId, out _);
    }

    public static void ForgetUnusedAccounts()
    {
        foreach (var id in Globals.SpotifyProfiles.Keys.Concat(_clients.Keys).Distinct().ToArray())
            if (AccountRepository.Current.FindSpotify(id) == null)
            {
                Globals.SpotifyProfiles.TryRemove(id, out _);
                InvalidateClient(id);
            }
    }

    public class Login
    {
        private sealed record PendingLogin(WebSocket Socket, string ProfileId, DateTime ExpiresAtUtc,
            string ShortCode, string AuthorizationUrl);
        private static readonly ConcurrentDictionary<string, PendingLogin> PendingSockets = new();
        private static readonly ConcurrentDictionary<string, string> ShortLinks = new();
        public static void ClearPendingLinks()
        {
            ShortLinks.Clear();
            PendingSockets.Clear();
        }

        public static readonly string RedirectUri =
            "https://jay.cpope.uk/Spotify/Callback";

        public static void RegisterCallbackEndpoint()
        {
            var app = Globals.App ?? throw new InvalidOperationException("Server is not initialized.");
            SpotifyCallbackPage.Map(app);
            app.MapGet("/s/{token}", async ctx =>
            {
                ctx.Response.Headers.CacheControl = "no-store";
                ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
                var token = ctx.Request.RouteValues["token"]?.ToString() ?? "";
                if (!ShortLinks.TryGetValue(token, out var state) ||
                    !PendingSockets.TryGetValue(state, out var pending) ||
                    pending.ExpiresAtUtc <= DateTime.UtcNow ||
                    AccountRepository.Current.Find(pending.ProfileId) == null)
                {
                    ShortLinks.TryRemove(token, out _);
                    ctx.Response.StatusCode = StatusCodes.Status410Gone;
                    await ctx.Response.WriteAsync("Spotify login link expired. Generate a new QR code on your home display.");
                    return;
                }

                // Only redirect to the server-created Spotify request, never a caller-supplied URL.
                ctx.Response.Redirect(pending.AuthorizationUrl);
            });
            app.MapGet("/Spotify/Callback", async ctx =>
            {
                var code = ctx.Request.Query["code"].ToString();
                var state = ctx.Request.Query["state"].ToString();

                if (string.IsNullOrEmpty(state) ||
                    !PendingSockets.TryRemove(state, out var pending) || pending.ExpiresAtUtc < DateTime.UtcNow ||
                    AccountRepository.Current.Find(pending.ProfileId) == null)
                {
                    await ctx.Response.WriteAsync("Invalid login session.");
                    return;
                }
                ShortLinks.TryRemove(pending.ShortCode, out _);
                if (string.IsNullOrEmpty(code))
                {
                    ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                    await ctx.Response.WriteAsync("Spotify connection was not completed. Return to your home display to try again.");
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
                        RefreshToken = tokenResponse.RefreshToken ?? AccountRepository.Current.FindSpotify(me.Id ?? "")?.RefreshToken ?? "",
                        AccessTokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn),
                        LastRequestedAtUtc = DateTime.MinValue
                    };

                    await AccountRepository.Current.SaveSpotify(profile, pending.ProfileId);
                    Globals.SpotifyProfiles[profile.Id] = profile;
                    InvalidateClient(profile.Id);

                    Console.WriteLine("[Spotify] Account credentials and household link saved.");

                    var homeProfile = AccountRepository.Current.Find(pending.ProfileId)!;
                    ctx.Response.Headers.CacheControl = "no-store";
                    ctx.Response.Redirect("/Spotify/Connected?receipt=" + SpotifyCallbackPage.CreateReceipt(homeProfile.Name));

                    var socket = pending.Socket;

                    if (socket.State == WebSocketState.Open)
                    {
                        var payload = new
                        {
                            Type = "Spotify/LoginResult",
                            DisplayName = profile.DisplayName,
                            UserId = profile.Id,
                            ProfileId = pending.ProfileId
                        };
                        var json = JsonSerializer.Serialize(payload, JsonOptions);
                        var bytes = Encoding.UTF8.GetBytes(json);
                        try
                        {
                            await socket.SendAsync(new ArraySegment<byte>(bytes),
                            WebSocketMessageType.Text, true, CancellationToken.None);
                        }
                        catch (WebSocketException) { /* The link is durable even if the display disconnected. */ }
                    }

                    StateUpdater.EnsureRunning();
                }
                catch (Exception ex)
                {
                    LogSpotifyError("OAuth callback", ex);
                    if (!ctx.Response.HasStarted)
                    {
                        ctx.Response.StatusCode = StatusCodes.Status502BadGateway;
                        await ctx.Response.WriteAsync("Spotify authentication failed. Check server logs.");
                    }
                }
            });
        }

        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            if (string.IsNullOrWhiteSpace(ClientId) || string.IsNullOrWhiteSpace(ClientSecret))
            {
                await socket.SendAsync(JsonSerializer.SerializeToUtf8Bytes(new
                {
                    Type = "Spotify/Login",
                    message.RequestId,
                    Error = "Spotify is not configured on the home server."
                }), WebSocketMessageType.Text, true, CancellationToken.None);
                return;
            }
            var profileId = message.Data.ValueKind == JsonValueKind.Object && message.Data.TryGetProperty("profileId", out var selected)
                ? selected.GetString() ?? "" : "";
            if (AccountRepository.Current.Find(profileId) == null)
            {
                await socket.SendAsync(JsonSerializer.SerializeToUtf8Bytes(new
                {
                    Type = "Spotify/Login",
                    message.RequestId,
                    Error = "Choose a household profile before connecting Spotify."
                }), WebSocketMessageType.Text, true, CancellationToken.None);
                return;
            }
            foreach (var old in PendingSockets.Where(item => item.Value.ExpiresAtUtc < DateTime.UtcNow).ToArray())
            {
                PendingSockets.TryRemove(old.Key, out _);
                ShortLinks.TryRemove(old.Value.ShortCode, out _);
            }
            var state = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

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

            // 128 random bits keep the public link short without making sessions guessable.
            var shortCode = Convert.ToBase64String(RandomNumberGenerator.GetBytes(16))
                .TrimEnd('=').Replace('+', '-').Replace('/', '_');
            PendingSockets[state] = new(socket, profileId, DateTime.UtcNow.AddMinutes(10),
                shortCode, loginRequest.ToUri().ToString());
            ShortLinks[shortCode] = state;
            var loginUrl = new Uri(RedirectUri).GetLeftPart(UriPartial.Authority) + "/s/" + shortCode;

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

    public static class StateUpdater
    {
        public static Task Prime() => Task.WhenAll(UpdateDevicesForAll(), UpdatePlaylistsForAll());
        private static bool IsActive(SpotifyProfile profile) => profile.LastRequestedAtUtc > DateTime.UtcNow.AddMinutes(-1)
            && AccountRepository.Current.FindSpotify(profile.Id) is { ReconnectRequired: false };
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
                    try { await UpdatePlaybackForAll(); }
                    catch (Exception ex) { LogSpotifyError("Playback update loop", ex); }
                }
            });

            // Devices (every 30s)
            _ = Task.Run(async () =>
            {
                while (true)
                {
                    await Task.Delay(TimeSpan.FromSeconds(30));
                    try { await UpdateDevicesForAll(); }
                    catch (Exception ex) { LogSpotifyError("Devices update loop", ex); }
                }
            });

            // Playlists (every 5m)
            _ = Task.Run(async () =>
            {
                while (true)
                {
                    await Task.Delay(TimeSpan.FromMinutes(5));
                    try { await UpdatePlaylistsForAll(); }
                    catch (Exception ex) { LogSpotifyError("Playlists update loop", ex); }
                }
            });

            Console.WriteLine("[Spotify] State updater started");
        }

        private static async Task UpdatePlaybackForAll()
        {
            foreach (var profile in Globals.SpotifyProfiles.Values)
            {
                if (string.IsNullOrEmpty(profile.AccessToken)) continue;

                var operation = "GetCurrentPlayback";
                try
                {
                    if (!IsActive(profile)) continue;
                    var spotify = await GetClient(profile);
                    var playback = await spotify.Player.GetCurrentPlayback();

                    if (playback?.Item is FullTrack track)
                    {
                        operation = "GetQueue";
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
                catch (Exception ex) { LogSpotifyError($"{operation} for {profile.Id}", ex); }
            }
        }

        private static async Task UpdateDevicesForAll()
        {
            foreach (var profile in Globals.SpotifyProfiles.Values)
            {
                if (string.IsNullOrEmpty(profile.AccessToken)) continue;

                try
                {
                    if (!IsActive(profile)) continue;
                    var spotify = await GetClient(profile);
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
                catch (Exception ex) { LogSpotifyError("Device update for " + profile.Id, ex); }
            }
        }

        private static async Task UpdatePlaylistsForAll()
        {
            foreach (var profile in Globals.SpotifyProfiles.Values)
            {
                if (string.IsNullOrEmpty(profile.AccessToken)) continue;

                try
                {
                    if (!IsActive(profile)) continue;
                    var spotify = await GetClient(profile);
                    var playlists = await spotify.Playlists.GetUsers(profile.Id);
                    profile.Playlists = playlists.Items?.Select(p => new SpotifyProfile.UserPlaylist
                    {
                        Id = p.Id ?? "",
                        Name = p.Name ?? ""
                    }).ToList() ?? new();
                    profile.ActivePlaylistId = profile.CurrentPlayback?.PlaylistId;
                }
                catch (Exception ex) { LogSpotifyError("Playlist update for " + profile.Id, ex); }
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

            var firstRequest = profile.LastRequestedAtUtc == DateTime.MinValue;
            profile.LastRequestedAtUtc = DateTime.UtcNow;
            if (firstRequest) _ = StateUpdater.Prime();
            var saved = AccountRepository.Current.FindSpotify(profile.Id);
            var response = new
            {
                Type = "Spotify/GetState",
                message.RequestId,
                Data = new
                {
                    profile.Id,
                    profile.DisplayName,
                    ReconnectRequired = saved?.ReconnectRequired ?? true,
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

            var success = true;
            var errorMsg = "";

            try
            {
                var spotify = await GetClient(profile);
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
            catch (Exception ex)
            {
                success = false;
                errorMsg = string.IsNullOrWhiteSpace(ex.Message) ? ex.GetType().Name : ex.Message;
                LogSpotifyError($"Playback action {action} for {profile.Id}", ex);
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
                var spotify = await GetClient(profile);
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
                var err = new { Type = "Spotify/Search", message.RequestId, Error = string.IsNullOrWhiteSpace(ex.Message) ? ex.GetType().Name : ex.Message };
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
                var spotify = await GetClient(profile);
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
                var err = new { Type = "Spotify/GetPlaylistTracks", message.RequestId, Error = string.IsNullOrWhiteSpace(ex.Message) ? ex.GetType().Name : ex.Message };
                var errJson = JsonSerializer.Serialize(err, JsonOptions);
                await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(errJson)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
    }
}
