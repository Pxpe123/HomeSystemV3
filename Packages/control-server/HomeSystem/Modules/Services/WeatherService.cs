using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Weather;

namespace CentralServer.Modules.Services;

public static class WeatherService
{
    private static readonly HttpClient _httpClient = new();
    private static string _apiKey = "";
    private static bool _isRunning = false;
    private static readonly object _lock = new();

    public static async Task StartAsync(string apiKey)
    {
        if (string.IsNullOrEmpty(apiKey))
        {
            Console.WriteLine("[Weather] No API key provided - service disabled");
            return;
        }

        lock (_lock)
        {
            if (_isRunning) return;
            _isRunning = true;
        }

        _apiKey = apiKey;
        Console.WriteLine("[Weather] Service starting...");

        // Initial fetch
        await FetchAllAsync();

        // Background loop
        _ = Task.Run(async () =>
        {
            while (_isRunning)
            {
                await Task.Delay(TimeSpan.FromMinutes(3));
                await FetchAllAsync();
            }
        });

        Console.WriteLine("[Weather] Service started - updating every 3 minutes");
    }

    public static void Stop()
    {
        _isRunning = false;
        Console.WriteLine("[Weather] Service stopped");
    }

    private static async Task FetchAllAsync()
    {
        var lat = Globals.IpInfo.Latitude;
        var lon = Globals.IpInfo.Longitude;

        if (lat == 0 && lon == 0)
        {
            Console.WriteLine("[Weather] No location data available - skipping fetch");
            return;
        }

        try
        {
            // Fetch all in parallel
            var weatherTask = FetchCurrentWeatherAsync(lat, lon);
            var forecastTask = FetchForecastAsync(lat, lon);
            var sunTask = FetchSunTimesAsync(lat, lon);

            await Task.WhenAll(weatherTask, forecastTask, sunTask);

            Globals.WeatherLastUpdated = DateTime.UtcNow;

            if (Globals.DevMode)
            {
                Console.WriteLine($"[Weather] Updated at {Globals.WeatherLastUpdated:HH:mm:ss} - {Globals.Weather?.Condition ?? "N/A"}, {Globals.Weather?.Temp}°C");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Weather] Error fetching data: {ex.Message}");
        }
    }

    private static async Task FetchCurrentWeatherAsync(float lat, float lon)
    {
        try
        {
            var url = $"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={_apiKey}";
            var response = await _httpClient.GetStringAsync(url);
            var json = JsonDocument.Parse(response);
            var root = json.RootElement;

            var weather = new WeatherData
            {
                Condition = root.GetProperty("weather")[0].GetProperty("main").GetString() ?? "Clear",
                Description = root.GetProperty("weather")[0].GetProperty("description").GetString() ?? "clear sky",
                Temp = (int)Math.Round(root.GetProperty("main").GetProperty("temp").GetDouble()),
                FeelsLike = (int)Math.Round(root.GetProperty("main").GetProperty("feels_like").GetDouble()),
                TempMin = (int)Math.Round(root.GetProperty("main").GetProperty("temp_min").GetDouble()),
                TempMax = (int)Math.Round(root.GetProperty("main").GetProperty("temp_max").GetDouble()),
                Humidity = root.GetProperty("main").GetProperty("humidity").GetInt32(),
                Pressure = root.GetProperty("main").GetProperty("pressure").GetInt32(),
                WindSpeed = (int)Math.Round(root.GetProperty("wind").GetProperty("speed").GetDouble() * 3.6), // m/s to km/h
                WindDeg = root.TryGetProperty("wind", out var wind) && wind.TryGetProperty("deg", out var deg) ? deg.GetInt32() : 0,
                Visibility = root.TryGetProperty("visibility", out var vis) ? vis.GetInt32() / 1000 : 10, // m to km
                Clouds = root.TryGetProperty("clouds", out var clouds) ? clouds.GetProperty("all").GetInt32() : 0
            };

            Globals.Weather = weather;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Weather] Failed to fetch current weather: {ex.Message}");
        }
    }

    private static async Task FetchForecastAsync(float lat, float lon)
    {
        try
        {
            var url = $"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=metric&appid={_apiKey}";
            var response = await _httpClient.GetStringAsync(url);
            var json = JsonDocument.Parse(response);
            var list = json.RootElement.GetProperty("list");

            var forecast = new List<ForecastDay>();
            var seenDates = new HashSet<string>();

            foreach (var item in list.EnumerateArray())
            {
                var dtTxt = item.GetProperty("dt_txt").GetString() ?? "";
                var date = dtTxt.Split(' ')[0];
                var hour = dtTxt.Split(' ')[1].Split(':')[0];

                // Get noon forecast for each day
                if (!seenDates.Contains(date) && hour == "12")
                {
                    forecast.Add(new ForecastDay
                    {
                        Date = date,
                        Temp = (int)Math.Round(item.GetProperty("main").GetProperty("temp").GetDouble()),
                        TempMin = (int)Math.Round(item.GetProperty("main").GetProperty("temp_min").GetDouble()),
                        TempMax = (int)Math.Round(item.GetProperty("main").GetProperty("temp_max").GetDouble()),
                        Condition = item.GetProperty("weather")[0].GetProperty("main").GetString() ?? "Clear",
                        Humidity = item.GetProperty("main").GetProperty("humidity").GetInt32(),
                        WindSpeed = (int)Math.Round(item.GetProperty("wind").GetProperty("speed").GetDouble() * 3.6)
                    });
                    seenDates.Add(date);
                }

                if (forecast.Count >= 5) break;
            }

            Globals.Forecast = forecast;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Weather] Failed to fetch forecast: {ex.Message}");
        }
    }

    private static async Task FetchSunTimesAsync(float lat, float lon)
    {
        try
        {
            var url = $"https://api.sunrise-sunset.org/json?lat={lat}&lng={lon}&formatted=0";
            var response = await _httpClient.GetStringAsync(url);
            var json = JsonDocument.Parse(response);
            var results = json.RootElement.GetProperty("results");

            var sunriseStr = results.GetProperty("sunrise").GetString();
            var sunsetStr = results.GetProperty("sunset").GetString();

            if (DateTime.TryParse(sunriseStr, out var sunriseTime) && DateTime.TryParse(sunsetStr, out var sunsetTime))
            {
                // Convert to local time
                sunriseTime = sunriseTime.ToLocalTime();
                sunsetTime = sunsetTime.ToLocalTime();

                Globals.SunTimes = new SunTimes
                {
                    Sunrise = sunriseTime.Hour + sunriseTime.Minute / 60.0,
                    Sunset = sunsetTime.Hour + sunsetTime.Minute / 60.0
                };
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Weather] Failed to fetch sun times: {ex.Message}");
        }
    }
}
