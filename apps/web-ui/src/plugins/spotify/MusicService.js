import { ObservableStore } from "../../core/ObservableStore.js";

/** Playback stays subscribed when the music page unmounts. */
export class MusicService extends ObservableStore {
  constructor(server, runtime) {
    super({
      userId: null,
      playback: null,
      playlists: [],
      devices: [],
      queue: [],
      error: null,
      loading: false,
      pending: false,
      reconnectRequired: false,
    });
    this.server = server;
    this.runtime = runtime;
    this.generation = 0;
  }
  setUser(userId) {
    if (userId === this.state.userId) return;
    this.generation++;
    clearInterval(this.poll);
    this.update({
      userId,
      playback: null,
      playlists: [],
      devices: [],
      queue: [],
      activePlaylistId: null,
      error: null,
      loading: false,
      pending: false,
      reconnectRequired: false,
    });
    this.runtime.setSession("spotify", { status: "idle", summary: "" });
    if (userId) {
      this.refresh();
      this.poll = setInterval(() => this.refresh(), 5000);
    } else this.runtime.setSession("spotify", { status: "idle", summary: "" });
  }
  async refresh() {
    if (
      !this.state.userId ||
      this.refreshing === this.generation ||
      this.server.getSnapshot().status !== "online"
    )
      return;
    const generation = this.generation;
    this.refreshing = generation;
    this.update({ loading: !this.state.playback });
    const userId = this.state.userId;
    try {
      const result = await this.server.request("Spotify/GetState", { userId });
      if (generation !== this.generation) return;
      this.update({ ...result.data, updatedAt: Date.now(), error: null });
      if (result.data?.reconnectRequired) {
        this.update({ playback: null, devices: [], playlists: [], queue: [] });
        this.runtime.setSession("spotify", { status: "idle", summary: "" });
        return;
      }
      const player = result.data?.playback;
      this.runtime.setSession("spotify", {
        status: player?.playbackState
          ? "running"
          : player?.songName
            ? "paused"
            : "idle",
        summary: player?.songName || player?.trackName || "Spotify",
        subtitle: player?.artistName || "",
        image: player?.songImage || "",
      });
    } catch (error) {
      if (generation === this.generation) this.update({ error: error.message });
    } finally {
      if (generation === this.generation) {
        this.refreshing = undefined;
        this.update({ loading: false });
      }
    }
  }
  async command(action, parameters = {}) {
    if (this.state.pending || !this.state.userId) return;
    const generation = this.generation;
    this.update({ pending: true, error: null });
    try {
      const response = await this.server.request("Spotify/Playback", {
        userId: this.state.userId,
        action,
        ...parameters,
      });
      if (response.data?.success === false)
        throw new Error(
          response.data.error || "Playback could not be changed.",
        );
      if (generation === this.generation) await this.refresh();
    } catch (error) {
      if (generation === this.generation) this.update({ error: error.message });
      throw error;
    } finally {
      if (generation === this.generation) this.update({ pending: false });
    }
  }
  stop() {
    clearInterval(this.poll);
  }
}
