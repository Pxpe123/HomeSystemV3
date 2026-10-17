using System.Net.WebSockets;
using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.Data.Messages;
using CentralServer.Modules.EndPoints.Spotify;
using CentralServer.Persistence;

namespace CentralServer.Modules;

public static class UserDataEndpoints
{
    public static bool ResetEnabled => Environment.GetEnvironmentVariable("HOMESYSTEM_ALLOW_DATA_RESET") == "true";
    private static Task Send(WebSocket socket, ClientMessage message, object data, string? error = null) =>
        socket.SendAsync(new ArraySegment<byte>(JsonSerializer.SerializeToUtf8Bytes(new
        { type = message.Type, requestId = message.RequestId, success = error == null, data, error })), WebSocketMessageType.Text, true, CancellationToken.None);

    public static Task Policy(WebSocket socket, ClientMessage message) => Send(socket, message, new { resetEnabled = ResetEnabled });
    public static async Task DeleteAll(WebSocket socket, ClientMessage message)
    {
        if (!ResetEnabled || message.Data.ValueKind != JsonValueKind.Object ||
            !message.Data.TryGetProperty("confirmation", out var confirmation) || confirmation.GetString() != "DELETE ALL USER DATA")
        {
            await Send(socket, message, new { }, "Data deletion is disabled or confirmation is missing.");
            return;
        }
        try
        {
            await AccountRepository.Current.ClearAll();
            Globals.SpotifyProfiles.Clear();
            Globals.Notifications.Clear();
            SpotifyManager.Login.ClearPendingLinks();
            SpotifyCallbackPage.ClearReceipts();
            SpotifyManager.ForgetUnusedAccounts();
            await Send(socket, message, new { dataGeneration = AccountRepository.Current.DataGeneration });
        }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        {
            await Send(socket, message, new { }, "Could not delete the server data. Nothing was acknowledged as deleted.");
        }
    }
}
