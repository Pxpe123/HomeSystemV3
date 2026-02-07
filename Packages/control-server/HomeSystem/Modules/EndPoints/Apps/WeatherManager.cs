using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Messages;
using CentralServer.Modules.Data.Weather;

namespace CentralServer.Modules.EndPoints.Apps;

public class WeatherManager
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public class GetWeather
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var response = new
            {
                Type = "Weather/GetWeather",
                RequestId = message.RequestId,
                Data = new
                {
                    Weather = Globals.Weather,
                    SunTimes = Globals.SunTimes,
                    Location = new
                    {
                        City = Globals.IpInfo.City,
                        Lat = Globals.IpInfo.Latitude,
                        Lon = Globals.IpInfo.Longitude,
                        Region = Globals.IpInfo.Region,
                        Country = Globals.IpInfo.Country,
                        Timezone = Globals.IpInfo.Timezone
                    },
                    SecondsUntilRefresh = Globals.WeatherSecondsUntilRefresh
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

    public class GetForecast
    {
        public static async Task Handle(WebSocket socket, ClientMessage message)
        {
            var response = new
            {
                Type = "Weather/GetForecast",
                RequestId = message.RequestId,
                Data = Globals.Forecast ?? new List<ForecastDay>()
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
}
