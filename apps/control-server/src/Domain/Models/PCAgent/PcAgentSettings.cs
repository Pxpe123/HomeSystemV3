namespace CentralServer.Modules.Data.PcAgent;

public class PcAgentSettings
{
    public bool DoNotDisturb { get; set; } = false;
    public bool NotificationsEnabled { get; set; } = true;

    public int RefreshIntervalSeconds { get; set; } = 60;
}