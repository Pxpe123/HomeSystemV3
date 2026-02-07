namespace CentralServer.Modules.Data;

public class Notification
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public string Type { get; set; } = "";
    public string? DeviceId { get; set; } = null;
    public string? AppName { get; set; } = null;
    public int Priority { get; set; } = 0;
    public string? HandlerFunction { get; set; } = "";
    public bool Dismissed { get; set; } = false;

    public DateTime NotificationTime { get; private set; } = DateTime.UtcNow;
    public TimeSpan NotificationAge => DateTime.UtcNow - NotificationTime;
}