using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Messages;

namespace CentralServer.Modules.EndPoints;

public class WakeOnLan
{
    public static async Task Handle(WebSocket socket, ClientMessage message)
    {
        // Call WOL
        PcManager.WakeOnLan(Globals.Pc.MacAddress, Globals.Pc.BroadCastIp);

        var response = new
        {
            requestId = message.RequestId, // echo requestId back to client
            type = "WakeOnLan",
            data = "Completed"
        };

        var json = JsonSerializer.Serialize(response);
        var bytes = Encoding.UTF8.GetBytes(json);

        await socket.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );
    }
}

public class Shutdown
{
    public static async Task Handle(WebSocket socket, ClientMessage message)
    {
        // Call shutdown
        PcManager.PowerOff(Globals.Pc.Ip);

        var response = new
        {
            requestId = message.RequestId,
            type = "Shutdown",
            data = "Completed"
        };

        var json = JsonSerializer.Serialize(response);
        var bytes = Encoding.UTF8.GetBytes(json);

        await socket.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );
    }
}