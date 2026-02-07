/*
 * HomeSystem V3 - Control Server
 * Main entry point for the WebSocket-based home automation server.
 * Handles device management, weather data, Spotify integration, and user profiles.
 */

using System.Reflection;
using System.Text.Json;
using System.Net;
using System.Text;
using CentralServer;
using CentralServer.Modules;
using CentralServer.Modules.Data;
using CentralServer.Modules.EndPoints.Spotify;
using CentralServer.Modules.Services;

internal class Program
{
    private static async Task Main(string[] args)
    {
        PrintBuildInfo();

        // Load configuration from environment
        var config = LoadConfiguration();

        // Initialize the web application
        var app = BuildWebApplication(args, config.Port);
        Globals.App = app;
        Globals.DevMode = config.DevMode;
        Globals.Pc = config.PcConfig;

        // Register Spotify OAuth callback endpoint
        SpotifyManager.Login.RegisterCallbackEndpoint();

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
        app.Run();
    }

    /// <summary>
    /// Prints build timestamp for debugging deployments.
    /// </summary>
    private static void PrintBuildInfo()
    {
        var buildTime = File.GetLastWriteTime(Assembly.GetExecutingAssembly().Location);
        Console.WriteLine($"Built At: {buildTime:dd/MM/yyyy HH:mm:ss}");
    }

    /// <summary>
    /// Loads all configuration from environment variables.
    /// </summary>
    private static (int Port, bool DevMode, PcConfig PcConfig, string WeatherApiKey, string WebUiUrl) LoadConfiguration()
    {
        // Server port (default: 8080)
        var portStr = Environment.GetEnvironmentVariable("PORT");
        var port = !string.IsNullOrEmpty(portStr) && int.TryParse(portStr, out var p) ? p : 8080;
        Console.WriteLine($"Port: {port}");

        // Development mode toggle
        var devModeStr = Environment.GetEnvironmentVariable("DEVMODE");
        var devMode = !string.IsNullOrEmpty(devModeStr) && bool.TryParse(devModeStr, out var dm) && dm;

        if (devMode)
            Console.WriteLine("Development mode ACTIVE");

        // PC configuration for Wake-on-LAN and shutdown
        var pcConfig = LoadPcConfig();

        // External API keys
        var weatherApiKey = Environment.GetEnvironmentVariable("WEATHER_API_KEY") ?? "";
        var webUiUrl = Environment.GetEnvironmentVariable("WebUI_URL") ?? "";

        return (port, devMode, pcConfig, weatherApiKey, webUiUrl);
    }

    /// <summary>
    /// Parses PC configuration JSON from environment variable.
    /// Used for Wake-on-LAN and remote shutdown features.
    /// </summary>
    private static PcConfig LoadPcConfig()
    {
        var pcJson = Environment.GetEnvironmentVariable("PC");

        if (string.IsNullOrEmpty(pcJson))
        {
            Console.WriteLine("[PC] No configuration provided");
            return new PcConfig();
        }

        try
        {
            var pc = JsonSerializer.Deserialize<PcConfig>(pcJson);
            if (pc != null)
            {
                Console.WriteLine($"[PC] MAC={pc.MacAddress}, IP={pc.Ip}, Broadcast={pc.BroadCastIp}");
                return pc;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PC] Failed to parse config: {ex.Message}");
        }

        return new PcConfig();
    }

    /// <summary>
    /// Creates and configures the ASP.NET Core web application.
    /// </summary>
    private static WebApplication BuildWebApplication(string[] args, int port)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.WebHost.ConfigureKestrel(options => options.ListenAnyIP(port));
        return builder.Build();
    }

    /// <summary>
    /// Initializes WebSocket server and registers all endpoint handlers.
    /// </summary>
    private static Websocket SetupWebSocket(WebApplication app, bool devMode)
    {
        var ws = new Websocket(app);

        // Register all endpoint modules from EndpointManager
        foreach (var ep in EndpointManager.GetAll())
            ws.RegisterModule(ep.Key, ep.Value);

        ws.MapSingleEndpoint("/ws");
        Console.WriteLine($"WebSocket listening at /ws");

        // Print available endpoints in dev mode
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
        try
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            var request = (HttpWebRequest)WebRequest.Create("https://ipapi.co/json/");
            request.UserAgent = "HomeSystemV3/1.0";
            request.Timeout = 10_000;

            using var response = (HttpWebResponse)await request.GetResponseAsync();
            using var stream = response.GetResponseStream();
            using var reader = new StreamReader(stream!, Encoding.UTF8);

            var json = await reader.ReadToEndAsync();
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
