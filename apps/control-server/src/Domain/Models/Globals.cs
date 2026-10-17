/*
 * Globals - Centralized application state
 * Stores all shared data that needs to be accessed across the application.
 * This includes connected devices, user profiles, weather data, and server config.
 */

using CentralServer.Modules.Data.Weather;

namespace CentralServer.Modules.Data;

public static class Globals
{
    // ─────────────────────────────────────────────────────────────
    // Server Configuration
    // ─────────────────────────────────────────────────────────────

    public static WebApplication? App { get; set; }
    public static Websocket? Ws { get; set; }
    public static Websocket? PcAgentWs { get; set; }
    public static string WebUiUrl { get; set; } = string.Empty;
    public static bool DevMode { get; set; } = false;
    public static string Region = "Liverpool";

    // ─────────────────────────────────────────────────────────────
    // Server Status
    // ─────────────────────────────────────────────────────────────

    public static DateTime ServerStartTime { get; } = DateTime.UtcNow;
    public static TimeSpan ServerUptime => DateTime.UtcNow - ServerStartTime;

    // ─────────────────────────────────────────────────────────────
    // Connected Devices & Agents
    // ─────────────────────────────────────────────────────────────

    public static Dictionary<string, Device.Device> Devices { get; } = new();
    public static Dictionary<string, PcAgent.PcAgent> PcAgents { get; } = new();
    public static PcConfig Pc { get; set; } = new();
    public static Dictionary<string, object> States { get; } = new();

    // ─────────────────────────────────────────────────────────────
    // User Data
    // ─────────────────────────────────────────────────────────────

    public static Dictionary<string, Profile> Profiles { get; } = new();
    public static Dictionary<string, SpotifyProfile> SpotifyProfiles { get; } = new();
    public static Dictionary<string, Notification> Notifications { get; } = new();

    // ─────────────────────────────────────────────────────────────
    // Location & Weather
    // ─────────────────────────────────────────────────────────────

    public static IpInfo IpInfo = new();
    public static WeatherData? Weather { get; set; }
    public static List<ForecastDay>? Forecast { get; set; }
    public static SunTimes? SunTimes { get; set; }
    public static DateTime WeatherLastUpdated { get; set; }
    public static int WeatherRefreshIntervalSeconds { get; set; } = 180;

    /// <summary>
    /// Calculates seconds until next weather refresh for client sync.
    /// </summary>
    public static int WeatherSecondsUntilRefresh =>
        Math.Max(0, WeatherRefreshIntervalSeconds - (int)(DateTime.UtcNow - WeatherLastUpdated).TotalSeconds);
}
