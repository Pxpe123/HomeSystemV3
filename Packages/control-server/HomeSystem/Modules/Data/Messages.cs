using System.Text.Json;

namespace CentralServer.Modules.Data.Messages;

public class ClientMessage
{
    public required string Type { get; set; }
    public string? RequestId { get; set; }
    public JsonElement Data { get; set; }
}

public class ServerResponse<T>
{
    public required string Type { get; set; }
    public string? RequestId { get; set; }
    public JsonElement Data { get; set; }
}

public struct AckResponse
{
    public string Type { get; set; } 
    public string? RequestId { get; set; }
    public string Status { get; set; }
}