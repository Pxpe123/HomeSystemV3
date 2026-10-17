using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace PcAgent;

/// <summary>
/// WebSocket client that connects to the control server.
/// Sends system stats on an interval and handles incoming commands.
/// Auto-reconnects on disconnect.
/// </summary>
public class ServerConnection
{
    private ClientWebSocket? _ws;
    private readonly CancellationTokenSource _cts = new();
    private readonly Dictionary<string, Action<JsonElement>> _handlers = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public bool IsConnected => _ws?.State == WebSocketState.Open;

    /// <summary>
    /// Register a handler for a specific message type from the server.
    /// </summary>
    public void On(string type, Action<JsonElement> handler)
    {
        _handlers[type] = handler;
    }

    /// <summary>
    /// Main connection loop. Connects, listens, and auto-reconnects.
    /// </summary>
    public async Task RunAsync()
    {
        while (!_cts.Token.IsCancellationRequested)
        {
            try
            {
                await ConnectAndListen();
            }
            catch (Exception ex)
            {
                Log($"Connection error: {ex.Message}");
            }

            if (_cts.Token.IsCancellationRequested) break;

            Log($"Reconnecting in {Config.ReconnectDelayMs}ms...");
            await Task.Delay(Config.ReconnectDelayMs, _cts.Token).ConfigureAwait(false);
        }
    }

    private async Task ConnectAndListen()
    {
        _ws?.Dispose();
        _ws = new ClientWebSocket();

        Log($"Connecting to {Config.ServerUrl}...");
        await _ws.ConnectAsync(new Uri(Config.ServerUrl), _cts.Token);
        Log("Connected");

        // Send identify message so server knows who we are
        await SendAsync("PcAgent/Identify", new
        {
            deviceName = Config.DeviceName,
            hostname = Environment.MachineName
        });

        // Listen for messages
        var buffer = new byte[4096];
        while (_ws.State == WebSocketState.Open && !_cts.Token.IsCancellationRequested)
        {
            var result = await _ws.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                Log("Server closed connection");
                break;
            }

            var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
            HandleMessage(json);
        }
    }

    private void HandleMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var type = root.TryGetProperty("Type", out var t) ? t.GetString()
                     : root.TryGetProperty("type", out var t2) ? t2.GetString()
                     : null;

            if (string.IsNullOrEmpty(type)) return;

            // Skip ack messages
            if (type == "ack") return;

            if (_handlers.TryGetValue(type, out var handler))
            {
                var data = root.TryGetProperty("Data", out var d) ? d
                         : root.TryGetProperty("data", out var d2) ? d2
                         : root;

                handler(data);
            }
            else
            {
                Log($"Unhandled message type: {type}");
            }
        }
        catch (Exception ex)
        {
            Log($"Failed to parse message: {ex.Message}");
        }
    }

    /// <summary>
    /// Send a typed message to the server (matches control-server protocol).
    /// </summary>
    public async Task SendAsync(string type, object? data = null)
    {
        if (_ws?.State != WebSocketState.Open) return;

        var message = new
        {
            Type = type,
            Data = data
        };

        var json = JsonSerializer.Serialize(message, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);

        await _ws.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            _cts.Token
        );
    }

    public void Stop()
    {
        _cts.Cancel();
        _ws?.Dispose();
    }

    private static void Log(string msg)
    {
        if (Config.Debug)
            System.Diagnostics.Debug.WriteLine($"[PcAgent] {msg}");
    }
}
