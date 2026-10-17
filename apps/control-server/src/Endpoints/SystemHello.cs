using System.Net.WebSockets;
using System.Text.Json;
using CentralServer.Modules.Data.Messages;

namespace CentralServer.Modules;

/// <summary>Read-only identity handshake. It does not authenticate a display.</summary>
public static class SystemHello
{
    public static async Task Handle(WebSocket socket, ClientMessage message)
    {
        var response = JsonSerializer.SerializeToUtf8Bytes(new
        {
            Type = "System/Hello", message.RequestId, Success = true,
            Data = new { service = "HomeSystem.ControlServer", protocolVersion = 1, build = Hosting.BuildInfo.Current }
        });
        await socket.SendAsync(new ArraySegment<byte>(response), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
