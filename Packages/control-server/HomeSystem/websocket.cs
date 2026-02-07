using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Device;
using CentralServer.Modules.Data.Messages;

namespace CentralServer;

public class Websocket
{
    private readonly WebApplication _app;
    private readonly Dictionary<string, Func<WebSocket, ClientMessage, Task>> _modules = new();

    public Websocket(WebApplication app)
    {
        _app = app;
        _app.UseWebSockets();
    }

    public IReadOnlyDictionary<string, Func<WebSocket, ClientMessage, Task>> GetModules => _modules;

    public void RegisterModule(string typeName, Func<WebSocket, ClientMessage, Task> handler)
    {
        if (!_modules.ContainsKey(typeName))
            _modules.Add(typeName, handler);
    }

    public void MapSingleEndpoint(string path)
    {
        _app.Map(path, async context =>
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = 400;
                return;
            }

            var socket = await context.WebSockets.AcceptWebSocketAsync();
            var remoteIp = "0.0.0.0";

            if (context.Connection.RemoteIpAddress != null)
            {
                var ip = context.Connection.RemoteIpAddress;
                remoteIp = ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4().ToString() : ip.ToString();
            }

            if (Globals.DevMode)
                Console.WriteLine($"WebSocket connected at {path} | From IP: {remoteIp}");

            var device = new Device { DeviceName = "Unknown", DeviceIP = remoteIp };
            device.Connect();
            Globals.Devices[device.DeviceID] = device;

            Console.WriteLine($"Device connected: {device.DeviceName} ({device.DeviceID})");
            Console.WriteLine($"Server uptime: {Globals.ServerUptime.TotalSeconds} seconds");

            Globals.States["MaintenanceMode"] = true;

            var buffer = new byte[4096];
            var segment = new ArraySegment<byte>(buffer);

            try
            {
                while (!socket.CloseStatus.HasValue)
                {
                    Array.Clear(buffer, 0, buffer.Length); // clear old data
                    var result = await socket.ReceiveAsync(segment, CancellationToken.None);

                    if (result.MessageType == WebSocketMessageType.Close)
                        break;

                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count).Trim();
                    if (string.IsNullOrEmpty(message))
                        continue; // skip empty messages

                    try
                    {
                        var clientMsg = JsonSerializer.Deserialize<ClientMessage>(
                            message,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                        );

                        if (clientMsg?.Type != null && _modules.TryGetValue(clientMsg.Type, out var handler))
                        {
                            var ack = new AckResponse
                            {
                                Type = "ack",
                                RequestId = clientMsg.RequestId,
                                Status = "received"
                            };
                            var ackJson = JsonSerializer.Serialize(ack);
                            var ackBytes = Encoding.UTF8.GetBytes(ackJson);
                            await socket.SendAsync(new ArraySegment<byte>(ackBytes), WebSocketMessageType.Text, true,
                                CancellationToken.None);

                            // Then run the actual handler (which can send the final response later)
                            await handler(socket, clientMsg);
                        }

                        else
                        {
                            Console.WriteLine($"No handler registered for type '{clientMsg?.Type}'");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to process message: {ex.Message}");
                    }
                }
            }
            finally
            {
                // Handle disconnect
                if (Globals.Devices.ContainsKey(device.DeviceID))
                {
                    Globals.Devices[device.DeviceID].Disconnect();
                    Globals.Devices.Remove(device.DeviceID);
                    Console.WriteLine($"Device disconnected: {device.DeviceName} ({device.DeviceID})");
                }

                if (socket.State != WebSocketState.Closed)
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
            }
        });
    }
}