using System.Net;
using System.Net.Sockets;
using System.Linq;
using System.Text.Json.Serialization;

namespace CentralServer.Modules.Data
{
    public class IpInfo
    {
        [JsonPropertyName("ip")]
        public string Ip { get; set; } = "";

        [JsonIgnore]
        public string InternalIp { get; set; }

        [JsonPropertyName("version")]
        public string Version { get; set; } = "";

        [JsonPropertyName("city")]
        public string City { get; set; } = "";

        [JsonPropertyName("region")]
        public string Region { get; set; } = "";

        [JsonPropertyName("country")]
        public string Country { get; set; } = "";

        [JsonPropertyName("country_name")]
        public string CountryName { get; set; } = "";

        [JsonPropertyName("country_code")]
        public string CountryCode { get; set; } = "";

        [JsonPropertyName("latitude")]
        public float Latitude { get; set; } = 0;

        [JsonPropertyName("longitude")]
        public float Longitude { get; set; } = 0;

        [JsonPropertyName("timezone")]
        public string Timezone { get; set; } = "";

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "";

        [JsonPropertyName("currency_name")]
        public string CurrencyName { get; set; } = "";

        public IpInfo()
        {
            InternalIp = GetLocalInternalIp();
        }

        private static string GetLocalInternalIp()
        {
            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());
                var localIp = host.AddressList.FirstOrDefault(ip =>
                    ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip));

                return localIp?.ToString() ?? "127.0.0.1";
            }
            catch
            {
                return "127.0.0.1";
            }
        }
    }
}