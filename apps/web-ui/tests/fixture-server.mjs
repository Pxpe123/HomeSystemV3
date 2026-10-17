/** Isolated UI verification backend. Never connects to a household server. */
import { WebSocketServer } from "ws";
import { solarTimes } from "../src/core/SolarTimes.js";
const port = Number(process.env.HOMESYSTEM_FIXTURE_PORT || 8499);
const server = new WebSocketServer({ host: "127.0.0.1", port });
const profile = {
  id: "fixture-profile",
  name: "UI Test",
  spotifyProfileId: "fixture-spotify",
  createdAt: new Date().toISOString(),
};
let playing = true;
let profiles = [profile];
let dataGeneration = "fixture-generation";
server.on("connection", (socket) =>
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    const send = (data) =>
      socket.send(
        JSON.stringify({
          type: message.Type,
          requestId: message.RequestId,
          success: true,
          data,
        }),
      );
    socket.send(JSON.stringify({ type: "ack", requestId: message.RequestId }));
    switch (message.Type) {
      case "System/Hello":
        send({ service: "HomeSystem.ControlServer", protocolVersion: 1 });
        break;
      case "Profile/GetAll":
        send({ profiles, dataGeneration });
        break;
      case "Profile/Login": {
        const selected = profiles.find(
          (item) => item.id === message.Data.profileId,
        );
        selected
          ? send({ profile: selected })
          : socket.send(
              JSON.stringify({
                type: message.Type,
                requestId: message.RequestId,
                success: false,
                error: "Profile not found.",
              }),
            );
        break;
      }
      case "Profile/Create": {
        const name = String(message.Data.name || "").trim();
        if (
          !name ||
          profiles.some(
            (item) => item.name.toLowerCase() === name.toLowerCase(),
          )
        ) {
          socket.send(
            JSON.stringify({
              type: message.Type,
              requestId: message.RequestId,
              success: false,
              error: "Choose a unique profile name.",
            }),
          );
        } else {
          const created = { id: crypto.randomUUID(), name };
          profiles.push(created);
          send({ profile: created });
        }
        break;
      }
      case "System/GetDataPolicy":
        send({ resetEnabled: true });
        break;
      case "System/DeleteAllUserData":
        if (message.Data.confirmation === "DELETE ALL USER DATA") {
          profiles = [];
          dataGeneration = crypto.randomUUID();
          send({ dataGeneration });
        } else
          socket.send(
            JSON.stringify({
              type: message.Type,
              requestId: message.RequestId,
              success: false,
              error: "Confirmation required.",
            }),
          );
        break;
      case "Weather/GetWeather":
        send({
          weather: {
            temp: 14,
            feelsLike: 12,
            humidity: 65,
            windSpeed: 11,
            pressure: 1015,
            visibility: 10,
            condition: "Clouds",
            description: "Partly cloudy",
            isPreview: true,
          },
          sunTimes: solarTimes(),
          location: { city: "Liverpool", lat: 53.4084, lon: -2.9916 },
          secondsUntilRefresh: 180,
        });
        break;
      case "Weather/GetForecast":
        send([]);
        break;
      case "Spotify/GetState":
        send({
          playback: {
            songName: "Test soundtrack",
            artistName: "Fixture artist",
            playbackState: playing,
            durationMs: 180000,
            progressMs: 30000,
          },
          devices: [
            { id: "fixture-speaker", name: "Test speaker", isActive: true },
          ],
          playlists: [],
        });
        break;
      case "Spotify/Playback":
        playing = message.Data.action === "play";
        send({ success: true });
        break;
      default:
        send({});
    }
  }),
);
console.log(
  `UI fixture server: ws://127.0.0.1:${port}/ws · Profile UI Test · no password · sample data only`,
);
