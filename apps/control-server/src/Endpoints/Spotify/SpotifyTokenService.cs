using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CentralServer.Persistence;

namespace CentralServer.Modules.EndPoints.Spotify;

public sealed record SpotifyTokenGrant(string AccessToken, string? RefreshToken, int ExpiresIn);
public sealed class SpotifyReconnectRequiredException : Exception
{
    public SpotifyReconnectRequiredException() : base("Spotify needs reconnecting. Open Spotify and connect your account again.") { }
}

/// <summary>Refresh only near expiry, serialize concurrent refreshes, persist rotation before use.</summary>
public sealed class SpotifyTokenService(AccountRepository accounts,
    Func<string, Task<SpotifyTokenGrant>> refresh, TimeProvider? clock = null)
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();
    private readonly ConcurrentDictionary<string, DateTimeOffset> _retryAfter = new();
    private readonly TimeProvider _clock = clock ?? TimeProvider.System;
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(15) };

    public async Task<string> GetAccessTokenAsync(string id)
    {
        var gate = _locks.GetOrAdd(id, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            var account = accounts.FindSpotify(id) ?? throw new SpotifyReconnectRequiredException();
            if (account.ReconnectRequired) throw new SpotifyReconnectRequiredException();
            if (!string.IsNullOrEmpty(account.AccessToken) && account.AccessTokenExpiresAtUtc > _clock.GetUtcNow().UtcDateTime.AddSeconds(60))
                return account.AccessToken;
            if (string.IsNullOrEmpty(account.RefreshToken))
            {
                account.ReconnectRequired = true;
                account.AccessToken = "";
                await accounts.SaveSpotify(account);
                throw new SpotifyReconnectRequiredException();
            }
            if (_retryAfter.TryGetValue(id, out var retry) && retry > _clock.GetUtcNow())
                throw new InvalidOperationException("Spotify refresh is temporarily unavailable. Try again shortly.");
            var previousRefreshToken = account.RefreshToken;
            try
            {
                var grant = await refresh(previousRefreshToken);
                if (string.IsNullOrEmpty(grant.AccessToken) || grant.ExpiresIn <= 0)
                    throw new InvalidOperationException("Spotify returned an invalid token response.");
                account.AccessToken = grant.AccessToken;
                if (!string.IsNullOrEmpty(grant.RefreshToken)) account.RefreshToken = grant.RefreshToken;
                account.AccessTokenExpiresAtUtc = _clock.GetUtcNow().UtcDateTime.AddSeconds(grant.ExpiresIn);
                await accounts.SaveSpotify(account, expectedRefreshToken: previousRefreshToken);
                _retryAfter.TryRemove(id, out _);
                return account.AccessToken;
            }
            catch (AccountChangedException)
            {
                // A new consent completed while this refresh was in flight; never overwrite it.
                var newer = accounts.FindSpotify(id);
                if (newer is { ReconnectRequired: false } && newer.AccessTokenExpiresAtUtc > _clock.GetUtcNow().UtcDateTime.AddSeconds(60))
                    return newer.AccessToken;
                throw new InvalidOperationException("Spotify account changed. Try again.");
            }
            catch (SpotifyReconnectRequiredException)
            {
                account.ReconnectRequired = true;
                account.AccessToken = account.RefreshToken = "";
                await accounts.SaveSpotify(account, expectedRefreshToken: previousRefreshToken);
                throw;
            }
            catch
            {
                _retryAfter[id] = _clock.GetUtcNow().AddSeconds(30);
                throw;
            }
        }
        finally { gate.Release(); }
    }

    public static async Task<SpotifyTokenGrant> RefreshFromSpotify(string refreshToken)
    {
        var clientId = Environment.GetEnvironmentVariable("SpotifyClientID");
        var clientSecret = Environment.GetEnvironmentVariable("SpotifyClientSecret");
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            throw new InvalidOperationException("Spotify is not configured on the server.");
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}")));
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        { ["grant_type"] = "refresh_token", ["refresh_token"] = refreshToken });
        using var response = await Http.SendAsync(request);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        if (!response.IsSuccessStatusCode)
        {
            if (json.RootElement.TryGetProperty("error", out var error) && error.GetString() == "invalid_grant")
                throw new SpotifyReconnectRequiredException();
            throw new InvalidOperationException($"Spotify token refresh is unavailable (HTTP {(int)response.StatusCode}).");
        }
        return new(json.RootElement.GetProperty("access_token").GetString() ?? "",
            json.RootElement.TryGetProperty("refresh_token", out var rotated) ? rotated.GetString() : null,
            json.RootElement.GetProperty("expires_in").GetInt32());
    }
}
