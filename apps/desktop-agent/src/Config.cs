namespace PcAgent;

public static class Config
{
    public static string ServerUrl { get; private set; } = "ws://localhost:8080/ws";
    public static string DeviceName { get; private set; } = Environment.MachineName;
    public static int ReconnectDelayMs { get; private set; } = 3000;
    public static int StatsIntervalMs { get; private set; } = 5000;
    public static bool Debug { get; private set; } = false;

    public static void Load()
    {
        var url = Environment.GetEnvironmentVariable("SERVER_URL");
        if (!string.IsNullOrEmpty(url))
            ServerUrl = url;

        var name = Environment.GetEnvironmentVariable("DEVICE_NAME");
        if (!string.IsNullOrEmpty(name))
            DeviceName = name;

        var debugStr = Environment.GetEnvironmentVariable("DEBUG");
        if (!string.IsNullOrEmpty(debugStr) && bool.TryParse(debugStr, out var d))
            Debug = d;

        var intervalStr = Environment.GetEnvironmentVariable("STATS_INTERVAL");
        if (!string.IsNullOrEmpty(intervalStr) && int.TryParse(intervalStr, out var i))
            StatsIntervalMs = Math.Max(1000, i);
    }
}
