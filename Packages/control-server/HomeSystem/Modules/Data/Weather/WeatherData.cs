using System.Text.Json.Serialization;

namespace CentralServer.Modules.Data.Weather;

public class WeatherData
{
    [JsonPropertyName("condition")]
    public string Condition { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("temp")]
    public int Temp { get; set; }

    [JsonPropertyName("feelsLike")]
    public int FeelsLike { get; set; }

    [JsonPropertyName("tempMin")]
    public int TempMin { get; set; }

    [JsonPropertyName("tempMax")]
    public int TempMax { get; set; }

    [JsonPropertyName("humidity")]
    public int Humidity { get; set; }

    [JsonPropertyName("pressure")]
    public int Pressure { get; set; }

    [JsonPropertyName("windSpeed")]
    public int WindSpeed { get; set; }

    [JsonPropertyName("windDeg")]
    public int WindDeg { get; set; }

    [JsonPropertyName("visibility")]
    public int Visibility { get; set; }

    [JsonPropertyName("clouds")]
    public int Clouds { get; set; }
}

public class ForecastDay
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = "";

    [JsonPropertyName("temp")]
    public int Temp { get; set; }

    [JsonPropertyName("tempMin")]
    public int TempMin { get; set; }

    [JsonPropertyName("tempMax")]
    public int TempMax { get; set; }

    [JsonPropertyName("condition")]
    public string Condition { get; set; } = "";

    [JsonPropertyName("humidity")]
    public int Humidity { get; set; }

    [JsonPropertyName("windSpeed")]
    public int WindSpeed { get; set; }
}

public class SunTimes
{
    [JsonPropertyName("sunrise")]
    public double Sunrise { get; set; }

    [JsonPropertyName("sunset")]
    public double Sunset { get; set; }
}
