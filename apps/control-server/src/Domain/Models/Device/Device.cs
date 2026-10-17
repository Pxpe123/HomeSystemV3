namespace CentralServer.Modules.Data.Device;

public class Device
{
    public string DeviceID { get; set; } = Guid.NewGuid().ToString(); // GET FROM SQL IN FUTURE
    public string DeviceIP { get; set; } = string.Empty;

    public string DeviceName { get; set; } = "Unnamed Device"; // GET FROM SQL IN FUTURE

    public DateTime ConnectedAt { get; private set; } = DateTime.UtcNow;
    public TimeSpan Uptime => DateTime.UtcNow - ConnectedAt;

    public DeviceStatus Status { get; set; } = DeviceStatus.Offline;

    public DeviceSettings Settings { get; set; } = new();

    public void Connect()
    {
        Status = DeviceStatus.Online;
        ConnectedAt = DateTime.UtcNow;
    }

    public void Disconnect()
    {
        Status = DeviceStatus.Offline;
    }
}