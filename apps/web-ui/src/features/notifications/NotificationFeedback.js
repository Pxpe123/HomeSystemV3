/** Optional local feedback; quiet mode always wins, history is never suppressed. */
export class NotificationFeedback {
  constructor(runtime, browser = globalThis) {
    this.runtime = runtime;
    this.browser = browser;
  }
  unlock = () => {
    if (!this.runtime.getSnapshot().preferences.soundEnabled) return;
    const AudioContext =
      this.browser.AudioContext || this.browser.webkitAudioContext;
    if (!AudioContext) return;
    this.audio ||= new AudioContext();
    this.audio.resume().catch(() => {});
  };
  start() {
    this.browser.addEventListener("pointerdown", this.unlock);
    this.unsubscribe = this.runtime.subscribe(() => {
      const { toast, preferences } = this.runtime.getSnapshot();
      if (!toast || toast.id === this.lastId) return;
      this.lastId = toast.id;
      if (preferences.doNotDisturb || toast.appId !== "clock") return;
      if (preferences.vibrationEnabled)
        this.browser.navigator?.vibrate?.([150, 80, 150]);
      if (!preferences.soundEnabled || this.audio?.state !== "running") return;
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      oscillator.connect(gain);
      gain.connect(this.audio.destination);
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.1, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audio.currentTime + 0.5,
      );
      oscillator.start();
      oscillator.stop(this.audio.currentTime + 0.5);
    });
  }
  stop() {
    this.unsubscribe?.();
    this.browser.removeEventListener("pointerdown", this.unlock);
    this.audio?.close().catch(() => {});
  }
}
