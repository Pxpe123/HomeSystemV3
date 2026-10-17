using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace CentralServer.V4;

public record HomeSnapshot(long Revision, DateTimeOffset UpdatedAt, IReadOnlyList<HomeApp> Apps, IReadOnlyList<Room> Rooms, IReadOnlyList<HomeDevice> Devices, IReadOnlyList<HomeRoutine> Routines, IReadOnlyList<HomeNotification> Notifications, HomeEnvironment Environment);
public record HomeApp(string Id, string Name, string Description, string Icon, string Accent, bool Enabled, int Order);
public record Room(string Id, string Name, string Icon, string Accent, string Summary);
public record HomeDevice(string Id, string RoomId, string Name, string Kind, bool IsOn, int? Level, bool IsAvailable, DateTimeOffset UpdatedAt);
public record HomeRoutine(string Id, string Name, string Description, string Icon, bool IsEnabled, IReadOnlyList<RoutineAction> Actions);
public record RoutineAction(string DeviceId, string Command, int? Level = null);
public record HomeNotification(string Id, string Title, string Body, string Severity, bool Read, DateTimeOffset CreatedAt, string? AppId = null);
public record HomeEnvironment(string Greeting, string WeatherSummary, decimal TemperatureCelsius, string Location, DateTimeOffset Sunrise, DateTimeOffset Sunset);
public record AssistantIntent(string Intent, string? TargetId = null, int? Level = null, string? Transcript = null, bool Confirmed = false);
public record IntentOutcome(bool Success, bool RequiresConfirmation, string Message, HomeSnapshot Snapshot);
public record HomeEvent(string Type, object Data, DateTimeOffset OccurredAt)
{
    public static HomeEvent StateChanged(HomeSnapshot snapshot, string message) => new("home.state.changed", new { snapshot, message }, DateTimeOffset.UtcNow);
}

public sealed class HomeStore
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly string _stateFile;
    private HomeSnapshot _snapshot;

    public HomeStore(IHostEnvironment environment)
    {
        var dataDirectory = Environment.GetEnvironmentVariable("HOMESYSTEM_DATA") ?? Path.Combine(environment.ContentRootPath, "data");
        Directory.CreateDirectory(dataDirectory);
        _stateFile = Path.Combine(dataDirectory, "home-state.json");
        _snapshot = Load() ?? Seed();
    }
    public HomeSnapshot Snapshot => _snapshot;

    public async Task<IntentOutcome> ExecuteIntentAsync(AssistantIntent intent, string actor, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var current = _snapshot;
            var devices = current.Devices.ToList();
            var message = "I couldn't find an action for that yet.";
            var requiresConfirmation = false;
            var success = false;
            if (intent.Intent.Equals("device.set", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(intent.TargetId))
            {
                var index = devices.FindIndex(device => device.Id == intent.TargetId);
                if (index >= 0)
                {
                    var device = devices[index];
                    if (!device.IsAvailable) return new(false, false, $"{device.Name} is unavailable.", current);
                    var level = intent.Level ?? (device.IsOn ? 0 : 100);
                    devices[index] = device with { IsOn = level > 0, Level = level, UpdatedAt = DateTimeOffset.UtcNow };
                    message = $"{device.Name} is now {(level > 0 ? "on" : "off")}.";
                    success = true;
                }
            }
            else if (intent.Intent.Equals("routine.run", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(intent.TargetId))
            {
                var routine = current.Routines.FirstOrDefault(value => value.Id == intent.TargetId);
                if (routine is not null)
                {
                    requiresConfirmation = routine.Actions.Any(action => action.Command is "lock" or "unlock" or "power.off");
                    if (requiresConfirmation && !intent.Confirmed) return new(false, true, $"Confirm running {routine.Name}?", current);
                    foreach (var action in routine.Actions)
                    {
                        var index = devices.FindIndex(device => device.Id == action.DeviceId);
                        if (index < 0) continue;
                        var device = devices[index];
                        var level = action.Level ?? (action.Command == "off" ? 0 : 100);
                        devices[index] = device with { IsOn = level > 0, Level = level, UpdatedAt = DateTimeOffset.UtcNow };
                    }
                    message = $"{routine.Name} is running.";
                    success = true;
                }
            }
            if (!success) return new(false, requiresConfirmation, message, current);
            _snapshot = current with { Revision = current.Revision + 1, UpdatedAt = DateTimeOffset.UtcNow, Devices = devices };
            await SaveAsync(ct);
            return new(true, false, message, _snapshot);
        }
        finally { _gate.Release(); }
    }

    private HomeSnapshot? Load()
    {
        try { return File.Exists(_stateFile) ? JsonSerializer.Deserialize<HomeSnapshot>(File.ReadAllText(_stateFile), JsonOptions) : null; }
        catch { return null; }
    }
    private Task SaveAsync(CancellationToken ct) => File.WriteAllTextAsync(_stateFile, JsonSerializer.Serialize(_snapshot, JsonOptions), ct);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private static HomeSnapshot Seed()
    {
        var now = DateTimeOffset.UtcNow;
        var apps = new[] { new HomeApp("rooms", "Rooms", "Control your spaces", "grid", "#7C9CFF", true, 1), new HomeApp("routines", "Routines", "Make home happen", "sparkles", "#61D9C2", true, 2), new HomeApp("music", "Music", "Every room, in tune", "music", "#FFB86B", true, 3), new HomeApp("security", "Security", "Calm, not noisy", "shield", "#B69CFF", true, 4), new HomeApp("activity", "Activity", "What changed", "bell", "#FF6B8A", true, 5), new HomeApp("settings", "Settings", "Household and displays", "settings", "#A7B0C6", true, 6) };
        var rooms = new[] { new Room("living", "Living room", "sofa", "#7C9CFF", "2 lights on"), new Room("kitchen", "Kitchen", "utensils", "#61D9C2", "Ready for tonight"), new Room("bedroom", "Bedroom", "bed", "#B69CFF", "Quiet"), new Room("outside", "Outside", "tree", "#FFB86B", "All secure") };
        var devices = new[] { new HomeDevice("living.lamp", "living", "Reading lamp", "light", true, 68, true, now), new HomeDevice("living.blinds", "living", "Window blinds", "cover", false, 0, true, now), new HomeDevice("kitchen.pendants", "kitchen", "Pendant lights", "light", true, 100, true, now), new HomeDevice("bedroom.lamp", "bedroom", "Bedside lamp", "light", false, 0, true, now), new HomeDevice("outside.door", "outside", "Front door", "lock", true, null, true, now) };
        var routines = new[] { new HomeRoutine("good-morning", "Good morning", "Raise lights, open the day", "sun", true, new[] { new RoutineAction("living.lamp", "on", 40), new RoutineAction("kitchen.pendants", "on", 85) }), new HomeRoutine("good-night", "Good night", "Settle every room", "moon", true, new[] { new RoutineAction("living.lamp", "off"), new RoutineAction("kitchen.pendants", "off"), new RoutineAction("bedroom.lamp", "on", 15) }) };
        var notices = new[] { new HomeNotification("welcome", "Your home is ready", "Connect an integration from Settings to make this dashboard yours.", "info", false, now, "settings") };
        return new HomeSnapshot(1, now, apps, rooms, devices, routines, notices, new HomeEnvironment("Good evening", "Partly cloudy", 12, "Home", now.Date.AddHours(7).AddMinutes(12), now.Date.AddHours(18).AddMinutes(41)));
    }
}

public sealed class HomeHub
{
    private readonly ConcurrentDictionary<string, WebSocket> _clients = new();
    private readonly HomeStore _store;
    public HomeHub(HomeStore store) => _store = store;
    public async Task ConnectAsync(WebSocket socket, CancellationToken ct)
    {
        var id = Convert.ToHexString(RandomNumberGenerator.GetBytes(12));
        _clients[id] = socket;
        await SendAsync(socket, new HomeEvent("home.snapshot", _store.Snapshot, DateTimeOffset.UtcNow), ct);
        var buffer = new byte[16 * 1024];
        try
        {
            while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var received = await socket.ReceiveAsync(buffer, ct);
                if (received.MessageType == WebSocketMessageType.Close) break;
                if (!received.EndOfMessage || received.Count == buffer.Length) continue;
                var intent = JsonSerializer.Deserialize<AssistantIntent>(Encoding.UTF8.GetString(buffer, 0, received.Count), new JsonSerializerOptions(JsonSerializerDefaults.Web));
                if (intent is null) continue;
                var outcome = await _store.ExecuteIntentAsync(intent, $"socket:{id}", ct);
                await PublishAsync(HomeEvent.StateChanged(outcome.Snapshot, outcome.Message), ct);
            }
        }
        finally { _clients.TryRemove(id, out _); if (socket.State == WebSocketState.Open) await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Goodbye", CancellationToken.None); }
    }
    public async Task PublishAsync(HomeEvent message, CancellationToken ct)
    {
        foreach (var socket in _clients.Values.Where(value => value.State == WebSocketState.Open).ToArray()) await SendAsync(socket, message, ct);
    }
    private static Task SendAsync(WebSocket socket, HomeEvent message, CancellationToken ct) =>
        socket.SendAsync(JsonSerializer.SerializeToUtf8Bytes(message, new JsonSerializerOptions(JsonSerializerDefaults.Web)), WebSocketMessageType.Text, true, ct);
}

public sealed class HomeStateWorker : BackgroundService
{
    private readonly ILogger<HomeStateWorker> _logger;
    public HomeStateWorker(ILogger<HomeStateWorker> logger) => _logger = logger;
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) { _logger.LogInformation("HomeSystem V4 state engine started"); await Task.Delay(Timeout.Infinite, stoppingToken); }
}
