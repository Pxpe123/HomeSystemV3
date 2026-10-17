using System.Net.WebSockets;
using System.Text.Json;
using CentralServer.Modules.Data.Messages;
using CentralServer.Persistence;

namespace CentralServer.Modules.EndPoints.Profiles;

/// <summary>Household selection is not authentication. Public profiles never include credentials.</summary>
public static class ProfileManager
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static string Text(ClientMessage message, string key) => message.Data.ValueKind == JsonValueKind.Object
        && message.Data.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
    private static async Task Reply(WebSocket socket, ClientMessage message, Func<Task<object>> action)
    {
        object response;
        try
        {
            var data = await action();
            EndPoints.Spotify.SpotifyManager.ForgetUnusedAccounts();
            response = new { type = message.Type, requestId = message.RequestId, success = true, data };
        }
        catch (Exception error) when (error is ArgumentException or IOException or UnauthorizedAccessException)
        {
            response = new
            {
                type = message.Type,
                requestId = message.RequestId,
                success = false,
                error = error is ArgumentException ? error.Message : "Could not save the profile on the server. Try again."
            };
        }
        await socket.SendAsync(JsonSerializer.SerializeToUtf8Bytes(response, Json), WebSocketMessageType.Text, true, CancellationToken.None);
    }
    public static class GetProfiles
    {
        public static Task Handle(WebSocket socket, ClientMessage message) => Reply(socket, message, () =>
        {
            var profiles = AccountRepository.Current.Profiles;
            return Task.FromResult<object>(new { profiles, count = profiles.Count, dataGeneration = AccountRepository.Current.DataGeneration });
        });
    }
    public static class CreateProfile
    {
        public static Task Handle(WebSocket socket, ClientMessage message) => Reply(socket, message,
            async () => new { profile = await AccountRepository.Current.Create(Text(message, "name")) });
    }
    public static class Login
    {
        public static Task Handle(WebSocket socket, ClientMessage message) => Reply(socket, message,
            async () => new { profile = await AccountRepository.Current.Select(Text(message, "profileId")) });
    }
    public static class UpdateProfile
    {
        public static Task Handle(WebSocket socket, ClientMessage message) => Reply(socket, message,
            async () => new { profile = await AccountRepository.Current.Rename(Text(message, "profileId"), Text(message, "name")) });
    }
    public static class DeleteProfile
    {
        public static Task Handle(WebSocket socket, ClientMessage message) => Reply(socket, message,
            async () => new { deleted = await AccountRepository.Current.Delete(Text(message, "profileId")) });
    }
    public static class LinkSpotify
    {
        public static Task Handle(WebSocket socket, ClientMessage message) => Reply(socket, message,
            async () => new { profile = await AccountRepository.Current.Link(Text(message, "profileId"), Text(message, "spotifyProfileId")) });
    }
}
