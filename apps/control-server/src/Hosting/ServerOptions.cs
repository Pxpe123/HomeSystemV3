using System.Text.Json;
using CentralServer.Modules.Data;

namespace CentralServer.Hosting;

internal sealed record ServerOptions(int Port, bool DevMode, PcConfig PcConfig, string WeatherApiKey, string WebUiUrl)
{
    public static ServerOptions FromEnvironment()
    {
        var rawPort = Environment.GetEnvironmentVariable("PORT") ?? "8080";
        if (!int.TryParse(rawPort, out var port) || port is < 1 or > 65535)
            throw new InvalidOperationException("PORT must be between 1 and 65535.");
        var rawPc = Environment.GetEnvironmentVariable("PC");
        PcConfig pc;
        try { pc = string.IsNullOrWhiteSpace(rawPc) ? new() : JsonSerializer.Deserialize<PcConfig>(rawPc) ?? new(); }
        catch (JsonException) { throw new InvalidOperationException("PC must contain valid PC configuration JSON."); }
        return new(port, bool.TryParse(Environment.GetEnvironmentVariable("DEVMODE"), out var dev) && dev,
            pc, Environment.GetEnvironmentVariable("WEATHER_API_KEY") ?? "",
            Environment.GetEnvironmentVariable("WebUI_URL") ?? "");
    }
}
