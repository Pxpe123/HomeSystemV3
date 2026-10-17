namespace CentralServer.Modules.Data;

public class PcConfig
{
    public string Name { get; set; } = string.Empty;
    public string MacAddress { get; set; } = string.Empty;
    public string Ip { get; set; } = string.Empty;
    public string BroadCastIp { get; set; } = string.Empty;
    public bool Shutdown { get; set; }
    public bool WakeOnLan { get; set; }
}