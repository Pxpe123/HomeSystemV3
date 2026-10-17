namespace CentralServer.Modules.Data.Device;

public class DeviceSettings
{
    public bool DoNotDisturb { get; set; } = false;
    public bool NotificationsEnabled { get; set; } = true;

    public int RefreshIntervalSeconds { get; set; } = 60;
}