namespace CentralServer.Modules.Data.PcAgent;

public class PcAgent
{
    public string DeviceIp { get; set; } = string.Empty;
    public string MacAddress { get; set; } = string.Empty;
    public string BroadCastIp { get; set; } = string.Empty;

    public bool Shutdown { get; set; } = false;

    public string DeviceName { get; set; } = "Unnamed Device";

    public DateTime ConnectedAt { get; private set; } = DateTime.UtcNow;
    public TimeSpan Uptime => DateTime.UtcNow - ConnectedAt;

    public PcAgentSettings Settings { get; set; } = new();

    public PcAgentStates PcAgentStates { get; set; }
    
    public void Connect()
    {
        PcAgentStates.Status = PcAgentStatus.Online;
        ConnectedAt = DateTime.UtcNow;
    }

    public void Disconnect()
    {
        PcAgentStates.Status = PcAgentStatus.Offline;
    }
}