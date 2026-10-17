using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Messages;

namespace CentralServer.Modules.Apps;

public static class GetEndpoints
{
    public static async Task Handle(WebSocket socket, ClientMessage message)
    {
        var response = EndpointManager.GetAll()
            .Keys
            .ToArray();
        var json = JsonSerializer.Serialize(new { endpoints = response });
        var bytes = Encoding.UTF8.GetBytes(json);
        await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}

public static class GetConnectedUsers
{
    public static async Task Handle(WebSocket socket, ClientMessage message)
    {
        var devices = Globals.Devices.Values;

        var json = JsonSerializer.Serialize(devices, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        var bytes = Encoding.UTF8.GetBytes(json);
        await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }
}

public static class GetServerUptime
{
    public static async Task Handle(WebSocket socket, ClientMessage message)
    {
        var response = new
        {
            uptime = Globals.ServerUptime,
            startedAt = Globals.ServerStartTime
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        var bytes = Encoding.UTF8.GetBytes(json);

        await socket.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );
    }
}

public static class GetDevModeState
{
    public static async Task Handle(WebSocket socket, ClientMessage message)
    {
        var response = new
        {
            Globals.DevMode
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        var bytes = Encoding.UTF8.GetBytes(json);

        await socket.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );
    }
}

public static class GetLocation
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static async Task Handle(WebSocket socket, ClientMessage message)
    {
        var response = new
        {
            Type = "getLocation",
            RequestId = message.RequestId,
            Data = new
            {
                City = Globals.IpInfo.City,
                Lat = Globals.IpInfo.Latitude,
                Lon = Globals.IpInfo.Longitude,
                Region = Globals.IpInfo.Region,
                Country = Globals.IpInfo.Country,
                CountryName = Globals.IpInfo.CountryName,
                Timezone = Globals.IpInfo.Timezone
            }
        };

        var json = JsonSerializer.Serialize(response, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);

        await socket.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );
    }
}