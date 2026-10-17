/*
 * HomeSystem V3 - Control Server
 * Main entry point for the WebSocket-based home automation server.
 * Handles device management, weather data, Spotify integration, and user profiles.
 */

using System.Text.Json;
using CentralServer;
using CentralServer.Modules;
using CentralServer.Modules.Data;
using CentralServer.Modules.EndPoints.Spotify;
using CentralServer.Modules.Services;

namespace CentralServer.Hosting;

/// <summary>Composition root for the existing integration modules.</summary>
internal static class ControlServerHost
{
    public static async Task RunAsync(string[] args)
    {
        PrintBuildInfo();

        // Load configuration from environment
        var config = ServerOptions.FromEnvironment();
        var dataDirectory = Environment.GetEnvironmentVariable("HOMESYSTEM_DATA");
        if (string.IsNullOrWhiteSpace(dataDirectory))
        {
            var localData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData,
                Environment.SpecialFolderOption.Create);
            if (string.IsNullOrEmpty(localData)) throw new InvalidOperationException("Set HOMESYSTEM_DATA to a persistent absolute directory.");
            dataDirectory = Path.Combine(localData, "HomeSystem", "ControlServer");
        }
        if (!Path.IsPathFullyQualified(dataDirectory)) throw new InvalidOperationException("HOMESYSTEM_DATA must be an absolute directory.");
        Persistence.AccountRepository.Initialize(dataDirectory);

        // Initialize the web application
        var app = BuildWebApplication(args, config.Port);
        Globals.App = app;
        Globals.DevMode = config.DevMode;
        Globals.Pc = config.PcConfig;
        Globals.WebUiUrl = config.WebUiUrl;
        app.MapGet("/api/health", () => Results.Ok(new { service = "HomeSystem.ControlServer", status = "ready", protocolVersion = 1, build = BuildInfo.Current }));
        app.MapGet("/api/version", (HttpContext context) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            return Results.Ok(BuildInfo.Current);
        });

        // Register Spotify OAuth callback endpoint
        SpotifyManager.Login.RegisterCallbackEndpoint();
        SpotifyManager.StateUpdater.EnsureRunning();

        // Setup WebSocket server with all endpoint modules
        var ws = SetupWebSocket(app, config.DevMode);
        Globals.Ws = ws;

        // Fetch geolocation data for weather services
        await FetchIpInfoAsync();

        // Start background services
        await WeatherService.StartAsync(config.WeatherApiKey);
        StartPcStatusMonitor(config.PcConfig.Ip);

        // Store WebUI URL for OAuth redirects
        Globals.WebUiUrl = config.WebUiUrl;

        Console.WriteLine($"Server ready on port {config.Port}");
        await app.RunAsync();
    }

    /// <summary>
    /// Prints build timestamp for debugging deployments.
    /// </summary>
    private static void PrintBuildInfo()
    {
        var build = BuildInfo.Current;
        Console.WriteLine($"HomeSystem {build.Version} | Build {build.BuildId} | Commit {build.Commit} | Built UTC {build.BuiltAtUtc}");
    }


    /// <summary>
    /// Creates and configures the ASP.NET Core web application.
    /// </summary>
    private static WebApplication BuildWebApplication(string[] args, int port)
    {
        var builder = WebApplication.CreateBuilder(args);
        // OAuth callback query strings must never appear in request logs.
        builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
        builder.WebHost.ConfigureKestrel(options => options.ListenAnyIP(port));
        return builder.Build();
    }

    /// <summary>
    /// Initializes WebSocket server and registers all endpoint handlers.
    /// </summary>
    private static Websocket SetupWebSocket(WebApplication app, bool devMode)
    {
        var ws = new Websocket(app);

        foreach (var ep in EndpointManager.GetAll())
            ws.RegisterModule(ep.Key, ep.Value);

        ws.MapSingleEndpoint("/ws");
        Console.WriteLine($"WebSocket listening at /ws");

        if (devMode)
        {
            Console.WriteLine("Available endpoints:");
            foreach (var endpoint in ws.GetModules.Keys)
                Console.WriteLine($"  - {endpoint}");
        }

        return ws;
    }

    /// <summary>
    /// Fetches public IP and geolocation data from ipapi.co
    /// Used for weather services and location display.
    /// </summary>
    private static async Task FetchIpInfoAsync()
    {
        // A household display uses its configured location rather than the
        // internet provider's IP location. Liverpool is this home's default.
        if ((Environment.GetEnvironmentVariable("WEATHER_LOCATION") ?? "Liverpool")
            .Equals("Liverpool", StringComparison.OrdinalIgnoreCase))
        {
            Globals.IpInfo = new IpInfo
            {
                City = "Liverpool",
                Region = "England",
                Country = "GB",
                CountryName = "United Kingdom",
                Timezone = "Europe/London",
                Latitude = 53.4084f,
                Longitude = -2.9916f
            };
            return;
        }
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://ipapi.co/json/");
            request.Headers.UserAgent.ParseAdd("HomeSystem/3.0");
            using var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            var ipInfo = JsonSerializer.Deserialize<IpInfo>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (ipInfo == null || ipInfo.Latitude == 0 || ipInfo.Longitude == 0)
            {
                Console.WriteLine("[Location] Invalid response from ipapi.co");
                return;
            }

            Globals.IpInfo = ipInfo;
            Console.WriteLine($"[Location] {ipInfo.City}, {ipInfo.Region} ({ipInfo.Latitude}, {ipInfo.Longitude})");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Location] Failed to fetch: {ex.Message}");
        }
    }

    /// <summary>
    /// Starts background thread to monitor PC online status.
    /// Logs when status changes (online/offline).
    /// </summary>
    private static void StartPcStatusMonitor(string pcIp)
    {
        if (string.IsNullOrEmpty(pcIp))
            return;

        var thread = new Thread(() =>
        {
            bool lastStatus = false;
            while (true)
            {
                bool currentStatus = PcManager.PcStatus(pcIp);
                if (lastStatus != currentStatus)
                {
                    Console.WriteLine($"[PC] Status changed: {(currentStatus ? "Online" : "Offline")}");
                    lastStatus = currentStatus;
                }
                Thread.Sleep(2500);
            }
        });

        thread.IsBackground = true;
        thread.Start();
    }
}
