/** Isolated UI verification backend. Never connects to a household server. */
import { WebSocketServer } from 'ws';
import { solarTimes } from '../src/core/SolarTimes.js';
const server = new WebSocketServer({ host: '127.0.0.1', port: 8499 });
const profile = { id: 'fixture-profile', name: 'UI Test', spotifyProfileId: 'fixture-spotify', createdAt: new Date().toISOString() };
let playing = true;
server.on('connection', socket => socket.on('message', raw => {
  const message = JSON.parse(raw.toString());
  const send = data => socket.send(JSON.stringify({ type: message.Type, requestId: message.RequestId, success: true, data }));
  socket.send(JSON.stringify({ type: 'ack', requestId: message.RequestId }));
  switch (message.Type) {
    case 'System/Hello': send({ service: 'HomeSystem.ControlServer', protocolVersion: 1 }); break;
    case 'Profile/GetAll': send({ profiles: [profile] }); break;
    case 'Profile/Login': message.Data.passcode === '1234' ? send({ profile }) : socket.send(JSON.stringify({ type: message.Type, requestId: message.RequestId, success: false, error: 'Use fixture passcode 1234.' })); break;
    case 'Weather/GetWeather': send({ weather: { temp: 14, feelsLike: 12, humidity: 65, windSpeed: 11, pressure: 1015, visibility: 10, condition: 'Clouds', description: 'Partly cloudy', isPreview: true }, sunTimes: solarTimes(), location: { city: 'Liverpool', lat: 53.4084, lon: -2.9916 }, secondsUntilRefresh: 180 }); break;
    case 'Weather/GetForecast': send([]); break;
    case 'Spotify/GetState': send({ playback: { songName: 'Test soundtrack', artistName: 'Fixture artist', playbackState: playing, durationMs: 180000, progressMs: 30000 }, devices: [{ id: 'fixture-speaker', name: 'Test speaker', isActive: true }], playlists: [] }); break;
    case 'Spotify/Playback': playing = message.Data.action === 'play'; send({ success: true }); break;
    default: send({});
  }
}));
console.log('UI fixture server: ws://127.0.0.1:8499/ws · Profile UI Test · PIN 1234');
