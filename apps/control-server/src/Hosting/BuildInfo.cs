using System.Reflection;
using System.Text.Json.Serialization;

namespace CentralServer.Hosting;

/// <summary>Immutable build provenance compiled into the assembly, never filesystem times.</summary>
public sealed record BuildInfo(
    [property: JsonPropertyName("version")] string Version,
    [property: JsonPropertyName("buildId")] string BuildId,
    [property: JsonPropertyName("commit")] string Commit,
    [property: JsonPropertyName("builtAtUtc")] string BuiltAtUtc)
{
    public static BuildInfo Current { get; } = Load();

    private static BuildInfo Load()
    {
        var metadata = typeof(BuildInfo).Assembly.GetCustomAttributes<AssemblyMetadataAttribute>()
            .ToDictionary(item => item.Key, item => item.Value);
        string Read(string name) => metadata.GetValueOrDefault($"HomeSystem.{name}") ?? "unknown";
        return new(Read("Version"), Read("BuildId"), Read("Commit"), Read("BuiltAtUtc"));
    }
}
