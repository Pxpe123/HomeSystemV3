using System.Text.Json;
using CentralServer.Modules.Data;
using Microsoft.AspNetCore.DataProtection;

namespace CentralServer.Persistence;

public sealed class AccountChangedException : InvalidOperationException { }

/// <summary>Atomic account snapshots. Credentials never appear in public profile DTOs.</summary>
public sealed class AccountRepository
{
    private readonly string _file;
    private readonly IDataProtector _protector;
    private readonly SemaphoreSlim _writer = new(1, 1);
    private Document _document = new();
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    public static AccountRepository Current { get; private set; } = null!;

    public sealed class StoredSpotify
    {
        public string Id { get; set; } = "";
        public string DisplayName { get; set; } = "";
        public string Email { get; set; } = "";
        public string ProtectedAccessToken { get; set; } = "";
        public string ProtectedRefreshToken { get; set; } = "";
        public DateTime AccessTokenExpiresAtUtc { get; set; }
        public bool ReconnectRequired { get; set; }
    }
    public sealed class Document
    {
        public int SchemaVersion { get; set; } = 1;
        public string DataGeneration { get; set; } = Guid.NewGuid().ToString();
        public Dictionary<string, Profile> Profiles { get; set; } = new();
        public Dictionary<string, StoredSpotify> Spotify { get; set; } = new();
    }

    public AccountRepository(string directory, IDataProtector protector)
    {
        Directory.CreateDirectory(directory);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(directory, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        _file = Path.Combine(directory, "accounts.json");
        _protector = protector;
        if (File.Exists(_file))
        {
            _document = JsonSerializer.Deserialize<Document>(File.ReadAllText(_file), Json)
                ?? throw new InvalidDataException("Account storage is empty; restore a backup rather than resetting profiles.");
            if (_document.SchemaVersion != 1) throw new InvalidDataException("Unsupported account storage version.");
            foreach (var entry in _document.Profiles)
                if (entry.Key != entry.Value.Id) throw new InvalidDataException("Invalid profile storage.");
            foreach (var entry in _document.Spotify.Values) _ = Decode(entry);
        }
    }

    public static void Initialize(string directory)
    {
        var keys = Path.Combine(directory, "keys");
        Directory.CreateDirectory(keys);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(keys, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        var provider = DataProtectionProvider.Create(new DirectoryInfo(keys), options => options.SetApplicationName("HomeSystem.Accounts"));
        Current = new AccountRepository(directory, provider.CreateProtector("spotify-tokens.v1"));
        foreach (var profile in Current._document.Spotify.Values) Globals.SpotifyProfiles[profile.Id] = Current.Decode(profile);
    }

    private static T Copy<T>(T value) => JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(value, Json), Json)!;
    public IReadOnlyList<Profile> Profiles => Copy(Volatile.Read(ref _document).Profiles.Values.ToList());
    public Profile? Find(string id) => Profiles.FirstOrDefault(profile => profile.Id == id);
    public string DataGeneration => Volatile.Read(ref _document).DataGeneration;
    public Task<bool> ClearAll() => Change(document =>
    {
        document.Profiles.Clear();
        document.Spotify.Clear();
        document.DataGeneration = Guid.NewGuid().ToString();
        return true;
    });
    public SpotifyProfile? FindSpotify(string id) => Volatile.Read(ref _document).Spotify.TryGetValue(id, out var saved) ? Decode(saved) : null;
    private SpotifyProfile Decode(StoredSpotify saved) => new()
    {
        Id = saved.Id,
        DisplayName = saved.DisplayName,
        Email = saved.Email,
        AccessToken = string.IsNullOrEmpty(saved.ProtectedAccessToken) ? "" : _protector.Unprotect(saved.ProtectedAccessToken),
        RefreshToken = string.IsNullOrEmpty(saved.ProtectedRefreshToken) ? "" : _protector.Unprotect(saved.ProtectedRefreshToken),
        AccessTokenExpiresAtUtc = saved.AccessTokenExpiresAtUtc,
        ReconnectRequired = saved.ReconnectRequired
    };
    private async Task<T> Change<T>(Func<Document, T> change)
    {
        await _writer.WaitAsync();
        try
        {
            var next = Copy(_document);
            var result = change(next);
            var bytes = JsonSerializer.SerializeToUtf8Bytes(next, Json);
            var options = new FileStreamOptions { Mode = FileMode.Create, Access = FileAccess.Write, Share = FileShare.None };
            if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            await using (var stream = new FileStream(_file + ".next", options))
            {
                await stream.WriteAsync(bytes);
                stream.Flush(flushToDisk: true);
            }
            File.Move(_file + ".next", _file, overwrite: true);
            Volatile.Write(ref _document, next);
            return Copy(result);
        }
        finally { _writer.Release(); }
    }
    public Task<Profile> Create(string name) => Change(document =>
    {
        name = ValidateName(name);
        if (document.Profiles.Values.Any(profile => profile.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            throw new ArgumentException("That profile name is already in use.");
        var profile = new Profile { Name = name, LastLogin = DateTime.UtcNow };
        document.Profiles.Add(profile.Id, profile);
        return profile;
    });
    public Task<Profile> Select(string id) => Change(document =>
    {
        var profile = Require(document, id);
        profile.LastLogin = DateTime.UtcNow;
        return profile;
    });
    public Task<Profile> Rename(string id, string name) => Change(document =>
    {
        var profile = Require(document, id);
        name = ValidateName(name);
        if (document.Profiles.Values.Any(other => other.Id != id && other.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            throw new ArgumentException("That profile name is already in use.");
        profile.Name = name;
        return profile;
    });
    public Task<bool> Delete(string id) => Change(document =>
    {
        var profile = Require(document, id);
        document.Profiles.Remove(id);
        RemoveUnusedSpotify(document, profile.SpotifyProfileId);
        return true;
    });
    public Task<Profile> Link(string id, string? spotifyId) => Change(document =>
    {
        var profile = Require(document, id);
        var previous = profile.SpotifyProfileId;
        if (!string.IsNullOrEmpty(spotifyId) && !document.Spotify.ContainsKey(spotifyId))
            throw new ArgumentException("Spotify account not found. Connect Spotify again.");
        profile.SpotifyProfileId = string.IsNullOrEmpty(spotifyId) ? null : spotifyId;
        RemoveUnusedSpotify(document, previous);
        return profile;
    });
    public Task<bool> SaveSpotify(SpotifyProfile account, string? profileId = null, string? expectedRefreshToken = null) => Change(document =>
    {
        if (string.IsNullOrWhiteSpace(account.Id)) throw new ArgumentException("Spotify returned an invalid account.");
        if (expectedRefreshToken != null && document.Spotify.TryGetValue(account.Id, out var existing)
            && Decode(existing).RefreshToken != expectedRefreshToken) throw new AccountChangedException();
        if (profileId != null)
        {
            var profile = Require(document, profileId);
            var previous = profile.SpotifyProfileId;
            profile.SpotifyProfileId = account.Id;
            RemoveUnusedSpotify(document, previous);
        }
        else if (!document.Spotify.ContainsKey(account.Id)) throw new ArgumentException("Spotify account was removed.");
        document.Spotify[account.Id] = new StoredSpotify
        {
            Id = account.Id,
            DisplayName = account.DisplayName,
            Email = account.Email,
            ProtectedAccessToken = string.IsNullOrEmpty(account.AccessToken) ? "" : _protector.Protect(account.AccessToken),
            ProtectedRefreshToken = string.IsNullOrEmpty(account.RefreshToken) ? "" : _protector.Protect(account.RefreshToken),
            AccessTokenExpiresAtUtc = account.AccessTokenExpiresAtUtc,
            ReconnectRequired = account.ReconnectRequired
        };
        return true;
    });
    private static void RemoveUnusedSpotify(Document document, string? id)
    {
        if (id != null && !document.Profiles.Values.Any(profile => profile.SpotifyProfileId == id)) document.Spotify.Remove(id);
    }
    private static Profile Require(Document document, string id) => document.Profiles.GetValueOrDefault(id)
        ?? throw new ArgumentException("Profile not found.");
    private static string ValidateName(string name)
    {
        name = name.Trim();
        if (name.Length is < 1 or > 60) throw new ArgumentException("Enter a profile name between 1 and 60 characters.");
        return name;
    }
}
