/*
 * EndpointManager - Central registry for all WebSocket endpoints
 * Maps message types to their handler functions.
 * Add new endpoints here to make them available to clients.
 */

using System.Net.WebSockets;
using CentralServer.Modules.Apps;
using CentralServer.Modules.Data.Messages;
using CentralServer.Modules.EndPoints;
using CentralServer.Modules.EndPoints.Apps;
using CentralServer.Modules.EndPoints.Profiles;
using CentralServer.Modules.EndPoints.Spotify;

namespace CentralServer.Modules;

public static class EndpointManager
{
    /// <summary>
    /// All registered WebSocket endpoint handlers.
    /// Key format: "Category/Action" (e.g., "Weather/GetForecast")
    /// </summary>
    private static readonly Dictionary<string, Func<WebSocket, ClientMessage, Task>> _endpoints = new()
    {
        // ─────────────────────────────────────────────────────────────
        // System Endpoints
        // ─────────────────────────────────────────────────────────────
        { "getEndpoints", GetEndpoints.Handle },
        { "getConnectedUsers", GetConnectedUsers.Handle },
        { "getDevMode", GetDevModeState.Handle },
        { "getServerUptime", GetServerUptime.Handle },
        { "getLocation", GetLocation.Handle },
        { "WakeOnLan", WakeOnLan.Handle },

        // ─────────────────────────────────────────────────────────────
        // Weather
        // ─────────────────────────────────────────────────────────────
        { "Weather/GetWeather", WeatherManager.GetWeather.Handle },
        { "Weather/GetForecast", WeatherManager.GetForecast.Handle },

        // ─────────────────────────────────────────────────────────────
        // Spotify Integration
        // ─────────────────────────────────────────────────────────────
        { "Spotify/Login", SpotifyManager.Login.Handle },
        { "Spotify/GetProfiles", SpotifyManager.GetProfiles.Handle },
        { "Spotify/GetState", SpotifyManager.GetState.Handle },
        { "Spotify/GetAllStates", SpotifyManager.GetAllStates.Handle },
        { "Spotify/Playback", SpotifyManager.PlaybackControl.Handle },
        { "Spotify/Search", SpotifyManager.Search.Handle },
        { "Spotify/GetPlaylistTracks", SpotifyManager.GetPlaylistTracks.Handle },

        // ─────────────────────────────────────────────────────────────
        // User Profiles
        // ─────────────────────────────────────────────────────────────
        { "Profile/GetAll", ProfileManager.GetProfiles.Handle },
        { "Profile/Create", ProfileManager.CreateProfile.Handle },
        { "Profile/Login", ProfileManager.Login.Handle },
        { "Profile/Update", ProfileManager.UpdateProfile.Handle },
        { "Profile/Delete", ProfileManager.DeleteProfile.Handle },
        { "Profile/LinkSpotify", ProfileManager.LinkSpotify.Handle }
    };

    /// <summary>
    /// Returns all registered endpoints for the WebSocket server.
    /// </summary>
    public static IReadOnlyDictionary<string, Func<WebSocket, ClientMessage, Task>> GetAll() => _endpoints;
}
