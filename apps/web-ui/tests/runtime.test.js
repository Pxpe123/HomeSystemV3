import test from 'node:test';
import assert from 'node:assert/strict';
import { HomeRuntime } from '../src/core/HomeRuntime.js';
import { StorageRepository } from '../src/core/StorageRepository.js';
import { ServerClient } from '../src/core/ServerClient.js';
import { MusicService } from '../src/plugins/spotify/MusicService.js';
import { NotificationFeedback } from '../src/features/notifications/NotificationFeedback.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) || null; }
  setItem(key, value) { this.values.set(key, value); }
}
function fixture() {
  const storage = new MemoryStorage();
  const repository = new StorageRepository(storage);
  let now = 100000;
  return { storage, repository, runtime: new HomeRuntime(repository, () => now), advance: ms => { now += ms; }, clock: () => now };
}

test('launcher density survives reload without changing app order or folders', () => {
  const f = fixture();
  const layout = [{ id: 'clock', type: 'app' }, { id: 'music', type: 'folder', name: 'Music', children: ['spotify'] }];
  f.runtime.setAppState('launcher', { layout });
  for (const viewMode of ['compact', 'expanded']) {
    f.runtime.setAppState('launcher', { viewMode });
    const restored = new HomeRuntime(f.repository, f.clock);
    assert.equal(restored.state.appData.launcher.viewMode, viewMode);
    assert.deepEqual(restored.state.appData.launcher.layout, layout);
  }
});

test('a timer survives reload and completes exactly once after the deadline', () => {
  const f = fixture();
  f.runtime.startTimer('Tea', 5);
  f.advance(7000);
  const restored = new HomeRuntime(f.repository, f.clock);
  restored.tick(); restored.tick();
  assert.equal(restored.state.timers[0].status, 'complete');
  assert.equal(restored.state.notifications.length, 1);
  restored.toggleTimer(restored.state.timers[0].id);
  assert.equal(restored.state.timers[0].status, 'complete');
});

test('pausing freezes a timer across navigation and reload; resume preserves the remaining time', () => {
  const f = fixture(); const timer = f.runtime.startTimer('Focus', 10);
  f.advance(3000); f.runtime.toggleTimer(timer.id);
  f.advance(100000);
  const restored = new HomeRuntime(f.repository, f.clock);
  restored.tick();
  assert.equal(restored.state.timers[0].remaining, 7000);
  assert.equal(restored.state.notifications.length, 0);
  restored.toggleTimer(timer.id); f.advance(7000); restored.tick();
  assert.equal(restored.state.notifications[0].title, 'Focus is ready');
});

test('cancellation prevents a completion alert', () => {
  const f = fixture(); const timer = f.runtime.startTimer('Cancel', 1);
  f.runtime.removeTimer(timer.id); f.advance(2000); f.runtime.tick();
  assert.equal(f.runtime.state.notifications.length, 0);
  assert.equal(f.runtime.state.sessions.clock.status, 'idle');
});

test('timer validation rejects invalid and out-of-range durations', () => {
  const f = fixture();
  for (const seconds of [0, -1, NaN, Infinity, 86401]) assert.throws(() => f.runtime.startTimer('Invalid', seconds));
});

test('stopwatch persists elapsed time and respects pause and reset', () => {
  const f = fixture(); f.runtime.toggleStopwatch(); f.advance(2500);
  const restored = new HomeRuntime(f.repository, f.clock);
  assert.equal(restored.stopwatchElapsed(), 2500);
  restored.toggleStopwatch(); f.advance(5000);
  assert.equal(restored.stopwatchElapsed(), 2500);
  restored.resetStopwatch(); assert.equal(restored.stopwatchElapsed(), 0);
});

test('notification read/dismiss and quiet mode persist while toasts stay transient', () => {
  const f = fixture(); f.runtime.setPreferences({ doNotDisturb: true });
  f.runtime.notify({ title: 'Saved update', dedupeKey: 'same' });
  f.runtime.notify({ title: 'Duplicate', dedupeKey: 'same' });
  assert.equal(f.runtime.state.notifications.length, 1);
  assert.equal(f.runtime.state.toast, null);
  f.runtime.read('all');
  const restored = new HomeRuntime(f.repository, f.clock);
  assert.equal(restored.state.notifications[0].read, true);
  restored.removeNotification(restored.state.notifications[0].id);
  assert.equal(new HomeRuntime(f.repository).state.notifications.length, 0);
});

test('global data and app-specific state persist without colliding', () => {
  const f = fixture();
  f.runtime.setGlobal('location', { city: 'Liverpool' });
  f.runtime.setAppState('launcher', { layout: [{ id: 'clock', type: 'app' }] });
  f.runtime.setAppState('clock', { showAnalog: true });
  const restored = new HomeRuntime(f.repository);
  assert.equal(restored.state.globals.location.city, 'Liverpool');
  assert.equal(restored.state.appData.launcher.layout[0].id, 'clock');
  assert.equal(restored.state.appData.clock.showAnalog, true);
});

test('dismissal and clearing can be undone without losing newer updates', () => {
  const f = fixture(); f.runtime.notify({ title: 'Original' });
  const id = f.runtime.state.notifications[0].id;
  f.runtime.removeNotification(id); assert.equal(f.runtime.state.notifications.length, 0);
  f.runtime.undoNotifications(); assert.equal(f.runtime.state.notifications[0].id, id);
  f.runtime.clearNotifications(); f.runtime.notify({ title: 'Newer' });
  f.runtime.undoNotifications(); assert.equal(f.runtime.state.notifications.length, 2);
});

test('corrupt, unsupported and malformed storage falls back safely', () => {
  const f = fixture();
  for (const value of ['{bad', '{"version":999}', '{"version":1,"timers":[null,42],"notifications":[null],"stopwatch":{"elapsed":"bad"}}']) {
    f.storage.setItem(f.repository.key, value);
    const restored = new HomeRuntime(f.repository);
    assert.equal(restored.state.timers.length, 0);
    assert.equal(restored.state.notifications.length, 0);
    assert.equal(restored.stopwatchElapsed(), 0);
  }
});

test('storage failure retains usable in-memory state with a visible warning', () => {
  const f = fixture(); const runtime = new HomeRuntime(new StorageRepository({ getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } }));
  runtime.startTimer('Tea', 10);
  assert.equal(runtime.state.timers.length, 1);
  assert.equal(runtime.state.toast.title, 'Display storage unavailable');
  assert.equal(f.runtime.state.timers.length, 0);
});

class FakeSocket {
  readyState = 0;
  sent = [];
  send(message) { this.sent.push(JSON.parse(message)); }
  close() { this.readyState = 3; this.onclose?.(); }
}
function clientFixture() {
  const client = new ServerClient('ws://test/ws', FakeSocket);
  client.connect(); client.socket.readyState = 1; client.socket.onopen();
  return client;
}
test('transport ignores acknowledgements and resolves the final response in either casing', async () => {
  const client = clientFixture(); const result = client.request('Weather/GetWeather');
  const id = client.socket.sent[0].RequestId;
  client.receive(JSON.stringify({ Type: 'ack', RequestId: id }));
  assert.equal(client.pending.size, 1);
  client.receive(JSON.stringify({ type: 'Weather/GetWeather', requestId: id, data: { temp: 12 } }));
  assert.equal((await result).data.temp, 12); client.stop();
});
test('transport rejects server errors, ignores malformed messages and rejects pending work on stop', async () => {
  const client = clientFixture();
  for (const message of ['bad', 'null', '42', '[]']) client.receive(message);
  const failed = client.request('Profile/Login');
  client.receive(JSON.stringify({ RequestId: client.socket.sent[0].RequestId, Error: 'Incorrect passcode' }));
  await assert.rejects(failed, /Incorrect passcode/);
  const pending = client.request('Spotify/Playback'); client.stop();
  await assert.rejects(pending, /Connection closed/);
  assert.equal(client.pending.size, 0); assert.equal(client.state.status, 'offline');
  await assert.rejects(client.request('WakeOnLan'), /offline/);
});
test('Spotify background state updates independently of a mounted screen', async () => {
  const f = fixture();
  const server = { getSnapshot: () => ({ status: 'online' }), request: async () => ({ data: { playback: { songName: 'Test track', artistName: 'Test artist', playbackState: true } } }) };
  const music = new MusicService(server, f.runtime);
  music.setUser('user'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.runtime.state.sessions.spotify.status, 'running');
  assert.equal(f.runtime.state.sessions.spotify.summary, 'Test track');
  music.setUser(null); music.stop();
  assert.equal(music.state.playback, null); assert.equal(f.runtime.state.sessions.spotify.status, 'idle');
});
test('Spotify never accepts stale responses after a profile change', async () => {
  const f = fixture(); let resolve;
  const server = { getSnapshot: () => ({ status: 'online' }), request: () => new Promise(done => { resolve = done; }) };
  const music = new MusicService(server, f.runtime); music.setUser('old'); music.setUser(null);
  resolve({ data: { playback: { songName: 'Old private track', playbackState: true } } });
  await new Promise(done => setImmediate(done));
  assert.equal(music.state.playback, null); assert.equal(f.runtime.state.sessions.spotify.summary, ''); music.stop();
});

test('optional timer feedback is cleaned up and quiet mode suppresses it', () => {
  const f = fixture(); let vibrations = 0; const listeners = new Set();
  const browser = { addEventListener: (_name, fn) => listeners.add(fn), removeEventListener: (_name, fn) => listeners.delete(fn), navigator: { vibrate: () => vibrations++ } };
  const feedback = new NotificationFeedback(f.runtime, browser); feedback.start();
  f.runtime.setPreferences({ vibrationEnabled: true });
  f.runtime.notify({ title: 'Ready', appId: 'clock' });
  assert.equal(vibrations, 1);
  f.runtime.setPreferences({ doNotDisturb: true });
  f.runtime.notify({ title: 'Quiet', appId: 'clock' });
  assert.equal(vibrations, 1); assert.equal(f.runtime.state.notifications.length, 2);
  feedback.stop(); assert.equal(listeners.size, 0);
});
test('removing a package clears its session, settings and launcher placements only', () => {
  const f = fixture();
  f.runtime.setSession('demo', { status: 'running' });
  f.runtime.setAppState('demo', { value: 'saved' });
  f.runtime.setAppState('launcher', { layout: [{ id: 'demo', type: 'app' }, { id: 'folder', type: 'folder', children: ['demo', 'clock'] }] });
  f.runtime.removeApp('demo');
  const state = f.runtime.getSnapshot();
  assert.equal(state.sessions.demo, undefined);
  assert.equal(state.appData.demo, undefined);
  assert.deepEqual(state.appData.launcher.layout, [{ id: 'folder', type: 'folder', children: ['clock'] }]);
});
