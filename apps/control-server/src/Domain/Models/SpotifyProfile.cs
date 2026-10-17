namespace CentralServer.Modules.Data;

public class SpotifyProfile
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Email { get; set; } = "";
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public DateTime LastActive { get; set; }

    public List<UserPlaylist> Playlists { get; set; } = new();
    public string? ActivePlaylistId { get; set; }

    public PlaybackInfo? CurrentPlayback { get; set; } // renamed class

    public class PlaybackInfo // renamed from PlaybackState
    {
        public string SongId { get; set; } = "";
        public string PlaylistId { get; set; } = "";
        public bool PlaybackState { get; set; } = false;
        public string SongName { get; set; } = "";
        public string ArtistName { get; set; } = "";
        public string SongImage { get; set; } = "";
        public string ActiveDevice { get; set; } = "";
        public int ProgressMs { get; set; } = 0;
        public int DurationMs { get; set; } = 0;
        public bool ShuffleState { get; set; } = false;
        public string RepeatState { get; set; } = "off";

        public List<QueueItem> Queue { get; set; } = new();

        public class QueueItem
        {
            public string SongId { get; set; } = "";
            public string SongName { get; set; } = "";
            public string ArtistName { get; set; } = "";
            public string SongImage { get; set; } = "";
            public int DurationMs { get; set; } = 0;
        }
    }

    public List<DeviceInfo> Devices { get; set; } = new();

    public class DeviceInfo
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsActive { get; set; } = false;
        public string Type { get; set; } = "";
        public int VolumePercent { get; set; } = 0;
    }
    
    public class UserPlaylist
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";

        public bool IsActive(string activePlaylistId)
        {
            return Id == activePlaylistId;
        }
    }
}