using System.Text.Json;
using CentralServer.Modules.Data;
using CentralServer.Modules.EndPoints.Spotify;
using CentralServer.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

var tests = new (string Name, Func<Task> Run)[]
{
    ("Phone receipt is standalone, HTML-encoded, private and single-use", async () =>
    {
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        await using var app = builder.Build();
        app.Urls.Add("http://127.0.0.1:0");
        SpotifyCallbackPage.Map(app);
        await app.StartAsync();
        var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        using var client = new HttpClient();
        var url = address + "/Spotify/Connected?receipt=" + SpotifyCallbackPage.CreateReceipt("Home <test>");
        using var response = await client.GetAsync(url);
        var page = await response.Content.ReadAsStringAsync();
        Check(page.Contains("Spotify connected") && page.Contains("Home &lt;test&gt;"), "Phone success receipt was not rendered safely");
        Check(page.Contains("close this tab on your phone") && !page.Contains("/ws"), "Receipt depends on display setup");
        Check(response.Headers.CacheControl?.NoStore == true, "Receipt can be cached");
        Check((await client.GetStringAsync(url)).Contains("Connection receipt expired"), "Receipt was reused");
        await app.StopAsync();
    }),
    ("Profiles and encrypted Spotify credentials survive repository restart", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("  Kitchen  ");
        var account = fixture.TokenAccount();
        Check(!JsonSerializer.Serialize(account).Contains(account.AccessToken), "Account serialization leaked access credentials");
        await fixture.Accounts.SaveSpotify(account, profile.Id);
        var restored = fixture.Reload();
        Check(restored.Find(profile.Id)?.Name == "Kitchen", "Profile name was not restored");
        Check(restored.Find(profile.Id)?.SpotifyProfileId == account.Id, "Spotify link was not restored");
        Check(restored.FindSpotify(account.Id)?.RefreshToken == account.RefreshToken, "Refresh token was not decrypted");
        var disk = File.ReadAllText(Path.Combine(fixture.Directory, "accounts.json"));
        Check(!disk.Contains(account.AccessToken) && !disk.Contains(account.RefreshToken), "Plaintext credential on disk");
        Check(!disk.Contains("passcode", StringComparison.OrdinalIgnoreCase), "Password field persisted");
        var publicJson = JsonSerializer.Serialize(restored.Profiles);
        Check(!publicJson.Contains(account.RefreshToken) && !publicJson.Contains(account.AccessToken), "Public profile leaked tokens");
        Check((await restored.Select(profile.Id)).LastLogin > DateTime.MinValue, "Selection was not saved");
    }),
    ("Concurrent creates enforce name uniqueness", async () =>
    {
        using var fixture = new Fixture();
        var creates = await Task.WhenAll(Enumerable.Range(0, 10).Select(async _ =>
        {
            try { await fixture.Accounts.Create("Home"); return true; }
            catch (ArgumentException) { return false; }
        }));
        Check(creates.Count(success => success) == 1, "Duplicate names were created");
        await Throws<ArgumentException>(() => fixture.Accounts.Create("   "));
        var profile = fixture.Accounts.Profiles.Single();
        await fixture.Accounts.Rename(profile.Id, "Living room");
        Check(fixture.Reload().Find(profile.Id)?.Name == "Living room", "Rename was not durable");
    }),
    ("Old password fields are ignored and removed on the next save", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("Legacy");
        var file = Path.Combine(fixture.Directory, "accounts.json");
        var text = File.ReadAllText(file).Replace("\"name\": \"Legacy\"", "\"name\": \"Legacy\", \"passcode\": \"test-only-old-code\"");
        File.WriteAllText(file, text);
        var restored = fixture.Reload();
        await restored.Select(profile.Id);
        Check(!File.ReadAllText(file).Contains("passcode"), "Legacy password field was retained");
    }),
    ("Failed disk write does not acknowledge or mutate a profile", async () =>
    {
        using var fixture = new Fixture();
        await fixture.Accounts.Create("Existing");
        System.IO.Directory.CreateDirectory(Path.Combine(fixture.Directory, "accounts.json.next"));
        try { await fixture.Accounts.Create("Must not exist"); throw new Exception("Write failure was ignored"); }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException) { }
        Check(fixture.Accounts.Profiles.Count == 1 && fixture.Reload().Profiles.Count == 1, "Failed write changed state");
    }),
    ("Valid access token is reused; concurrent expiry refreshes exactly once", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("Music");
        var account = fixture.TokenAccount();
        account.AccessTokenExpiresAtUtc = DateTime.UtcNow.AddHours(1);
        await fixture.Accounts.SaveSpotify(account, profile.Id);
        var count = 0;
        var tokens = new SpotifyTokenService(fixture.Accounts, async _ =>
        {
            Interlocked.Increment(ref count);
            await Task.Delay(20);
            return new("rotated-access-token", "rotated-refresh-token", 3600);
        });
        Check(await tokens.GetAccessTokenAsync(account.Id) == account.AccessToken && count == 0, "Refreshed a valid token");
        account.AccessTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
        await fixture.Accounts.SaveSpotify(account);
        var results = await Task.WhenAll(Enumerable.Range(0, 15).Select(_ => tokens.GetAccessTokenAsync(account.Id)));
        Check(count == 1 && results.All(value => value == "rotated-access-token"), "Concurrent refresh was duplicated");
        Check(fixture.Reload().FindSpotify(account.Id)?.RefreshToken == "rotated-refresh-token", "Rotated token was not saved");
    }),
    ("Refresh responses without rotation retain the refresh token", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("No rotation");
        var account = fixture.TokenAccount();
        await fixture.Accounts.SaveSpotify(account, profile.Id);
        var tokens = new SpotifyTokenService(fixture.Accounts, _ => Task.FromResult(new SpotifyTokenGrant("fresh-access", null, 3600)));
        await tokens.GetAccessTokenAsync(account.Id);
        Check(fixture.Reload().FindSpotify(account.Id)?.RefreshToken == account.RefreshToken, "Refresh token was discarded");
    }),
    ("Revoked refresh token is cleared once and requires reconnect", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("Revoked");
        var account = fixture.TokenAccount();
        await fixture.Accounts.SaveSpotify(account, profile.Id);
        var count = 0;
        var tokens = new SpotifyTokenService(fixture.Accounts, _ => { count++; throw new SpotifyReconnectRequiredException(); });
        await Throws<SpotifyReconnectRequiredException>(() => tokens.GetAccessTokenAsync(account.Id));
        await Throws<SpotifyReconnectRequiredException>(() => tokens.GetAccessTokenAsync(account.Id));
        var restored = fixture.Reload().FindSpotify(account.Id)!;
        Check(count == 1 && restored.ReconnectRequired && restored.RefreshToken == "", "Revoked token was retried or retained");
    }),
    ("Transient refresh failure preserves credentials and backs off", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("Offline");
        var account = fixture.TokenAccount();
        await fixture.Accounts.SaveSpotify(account, profile.Id);
        var count = 0;
        var tokens = new SpotifyTokenService(fixture.Accounts, _ => { count++; throw new HttpRequestException("offline"); });
        await Throws<HttpRequestException>(() => tokens.GetAccessTokenAsync(account.Id));
        await Throws<InvalidOperationException>(() => tokens.GetAccessTokenAsync(account.Id));
        Check(count == 1 && fixture.Reload().FindSpotify(account.Id)?.RefreshToken == account.RefreshToken, "Transient failure lost credentials");
    }),
    ("A late refresh cannot overwrite newer Spotify consent", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("Relink race");
        var account = fixture.TokenAccount();
        await fixture.Accounts.SaveSpotify(account, profile.Id);
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finish = new TaskCompletionSource<SpotifyTokenGrant>(TaskCreationOptions.RunContinuationsAsynchronously);
        var tokens = new SpotifyTokenService(fixture.Accounts, _ => { started.SetResult(); return finish.Task; });
        var pending = tokens.GetAccessTokenAsync(account.Id);
        await started.Task;
        account.AccessToken = "new-consent-access";
        account.RefreshToken = "new-consent-refresh";
        account.AccessTokenExpiresAtUtc = DateTime.UtcNow.AddHours(1);
        await fixture.Accounts.SaveSpotify(account, profile.Id);
        finish.SetResult(new("stale-refresh-access", "stale-refresh-token", 3600));
        Check(await pending == "new-consent-access", "Late refresh replaced the new consent token");
        Check(fixture.Reload().FindSpotify(account.Id)?.RefreshToken == "new-consent-refresh", "New consent was lost on disk");
    }),
    ("Deleting the final linked profile removes saved credentials", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("Remove");
        var account = fixture.TokenAccount();
        await fixture.Accounts.SaveSpotify(account, profile.Id);
        await fixture.Accounts.Delete(profile.Id);
        Check(fixture.Reload().Profiles.Count == 0 && fixture.Reload().FindSpotify(account.Id) == null, "Credentials remained after deletion");
        await Throws<ArgumentException>(() => fixture.Accounts.SaveSpotify(account));
    }),
    ("Testing reset durably clears accounts and changes the data generation", async () =>
    {
        using var fixture = new Fixture();
        var profile = await fixture.Accounts.Create("Reset");
        await fixture.Accounts.SaveSpotify(fixture.TokenAccount(), profile.Id);
        var generation = fixture.Accounts.DataGeneration;
        await fixture.Accounts.ClearAll();
        var restored = fixture.Reload();
        Check(restored.Profiles.Count == 0 && restored.FindSpotify("fake-spotify") == null && restored.DataGeneration != generation, "Reset was not durable");
    }),
    ("Corrupt storage fails closed without overwriting the file", () =>
    {
        using var fixture = new Fixture();
        var file = Path.Combine(fixture.Directory, "accounts.json");
        File.WriteAllText(file, "broken-json");
        try { fixture.Reload(); throw new Exception("Corrupt storage was accepted"); }
        catch (JsonException) { }
        Check(File.ReadAllText(file) == "broken-json", "Corrupt data was overwritten");
        return Task.CompletedTask;
    })
};
foreach (var test in tests) { await test.Run(); Console.WriteLine($"PASS {test.Name}"); }
Console.WriteLine($"{tests.Length} account tests passed (no Spotify network requests).");

static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
static async Task Throws<T>(Func<Task> action) where T : Exception
{
    try { await action(); } catch (T) { return; }
    throw new Exception($"Expected {typeof(T).Name}");
}
sealed class Fixture : IDisposable
{
    public string Directory { get; } = Path.Combine(Path.GetTempPath(), "HomeSystem-AccountTests-" + Guid.NewGuid());
    public AccountRepository Accounts { get; }
    public Fixture()
    {
        Accounts = Reload();
    }
    public AccountRepository Reload()
    {
        var provider = DataProtectionProvider.Create(new DirectoryInfo(Path.Combine(Directory, "keys")), options => options.SetApplicationName("HomeSystem.AccountTests"));
        return new(Directory, provider.CreateProtector("test-tokens"));
    }
    public SpotifyProfile TokenAccount() => new()
    {
        Id = "fake-spotify",
        DisplayName = "Test account",
        AccessToken = "fake-private-access-token",
        RefreshToken = "fake-private-refresh-token",
        AccessTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1)
    };
    public void Dispose() => System.IO.Directory.Delete(Directory, recursive: true);
}
