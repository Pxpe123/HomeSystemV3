import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionSettings } from '../src/core/ConnectionSettings.js';

test('connection settings validate, normalise and persist only endpoints', () => {
  const values = new Map();
  const store = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const settings = new ConnectionSettings(store, 'ws://localhost/ws');
  assert.equal(settings.normalize('http://homesystem:8088'), 'ws://homesystem:8088/ws');
  assert.equal(settings.save('https://homesystem/'), true);
  assert.deepEqual(settings.load(), { endpoint: 'wss://homesystem/ws' });
  for (const value of ['ftp://host', 'http://user:secret@host', 'http://host/?token=x', 'http://host/#x'])
    assert.throws(() => settings.normalize(value));
});
test('secure displays reject mixed content; unavailable storage stays honest', () => {
  const settings = new ConnectionSettings(null, 'wss://home/ws');
  assert.throws(() => settings.normalize('ws://home/ws'));
  assert.equal(settings.save('wss://home/ws'), false);
  assert.equal(settings.load(), null);
});
