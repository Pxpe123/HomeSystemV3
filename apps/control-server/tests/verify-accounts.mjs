/** Offline endpoint/restart verification. Uses an isolated data directory and no real provider credentials. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { once } from "node:events";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const data = await mkdtemp(path.join(tmpdir(), "HomeSystem-EndpointTests-"));
let child;
let socket;
let port;
let counter = 0;
async function stop() {
  socket?.close();
  if (child && child.exitCode === null) {
    child.kill();
    await once(child, "exit");
  }
}
async function start(reset = false) {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  child = spawn(
    "dotnet",
    [
      path.join(
        root,
        ".local/build/dotnet/control-server/Release/net9.0/CentralServer.dll",
      ),
    ],
    {
      cwd: root,
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...process.env,
        PORT: String(port),
        HOMESYSTEM_DATA: data,
        WEATHER_LOCATION: "Liverpool",
        WEATHER_API_KEY: "",
        PC: "{}",
        SpotifyClientID: "test-client",
        SpotifyClientSecret: "test-secret",
        HOMESYSTEM_ALLOW_DATA_RESET: String(reset),
        DOTNET_ROLL_FORWARD: "Major",
      },
    },
  );
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      ready = (await fetch(`http://127.0.0.1:${port}/api/health`)).ok;
    } catch {
      /* Wait for local startup. */
    }
    if (ready) break;
    if (child.exitCode !== null)
      throw new Error("Isolated server exited before startup");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Server did not start");
  socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
}
function request(type, values = {}) {
  return new Promise((resolve, reject) => {
    const id = `account-test-${++counter}`;
    const timer = setTimeout(() => {
      socket.removeEventListener("message", receive);
      reject(new Error(`Timed out: ${type}`));
    }, 5000);
    function receive(event) {
      const value = JSON.parse(event.data);
      if (
        (value.requestId ?? value.RequestId) !== id ||
        (value.type ?? value.Type) === "ack"
      )
        return;
      clearTimeout(timer);
      socket.removeEventListener("message", receive);
      resolve(value);
    }
    socket.addEventListener("message", receive);
    socket.send(JSON.stringify({ Type: type, RequestId: id, Data: values }));
  });
}
try {
  await start();
  const created = await request("Profile/Create", { name: "Endpoint test" });
  assert.equal(created.success, true);
  const id = created.data.profile.id;
  assert.equal(
    (await request("Profile/Login", { profileId: id })).success,
    true,
  );
  assert.equal(
    (await request("Profile/Create", { name: "endpoint test" })).success,
    false,
  );
  const profiles = await request("Profile/GetAll");
  assert.ok(
    !/passcode|accessToken|refreshToken/i.test(JSON.stringify(profiles)),
  );
  assert.equal(
    (await request("System/GetDataPolicy")).data.resetEnabled,
    false,
  );
  assert.equal(
    (
      await request("System/DeleteAllUserData", {
        confirmation: "DELETE ALL USER DATA",
      })
    ).success,
    false,
  );
  const login = await request("Spotify/Login", { profileId: id });
  const shortUrl = new URL(login.data.loginUrl);
  assert.match(shortUrl.pathname, /^\/s\/[A-Za-z0-9_-]{22}$/);
  assert.equal(shortUrl.search, "");
  assert.ok(login.data.loginUrl.length < 70);
  const resolveLink = () =>
    fetch(`http://127.0.0.1:${port}${shortUrl.pathname}`, {
      redirect: "manual",
    });
  const redirect = await resolveLink();
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("cache-control"), "no-store");
  assert.equal(redirect.headers.get("referrer-policy"), "no-referrer");
  const authorize = new URL(redirect.headers.get("location"));
  assert.equal(authorize.origin, "https://accounts.spotify.com");
  assert.ok(authorize.searchParams.get("state"));
  assert.equal(authorize.searchParams.get("client_id"), "test-client");
  assert.equal(
    (await resolveLink()).status,
    302,
    "Link previews must not consume the session",
  );
  const cancelled = await fetch(
    `http://127.0.0.1:${port}/Spotify/Callback?state=${authorize.searchParams.get("state")}&error=access_denied`,
  );
  assert.equal(cancelled.status, 400);
  assert.equal(
    (await resolveLink()).status,
    410,
    "Completed/cancelled sessions cannot be reused",
  );
  assert.equal((await fetch(`http://127.0.0.1:${port}/s/invalid`)).status, 410);
  const receipt = await fetch(
    `http://127.0.0.1:${port}/Spotify/Connected?receipt=invalid`,
  );
  assert.equal(receipt.headers.get("cache-control"), "no-store");
  assert.match(await receipt.text(), /Connection receipt expired/);
  assert.equal(
    (await request("Spotify/Login", { profileId: "missing" })).Error.includes(
      "profile",
    ),
    true,
  );
  await stop();
  await start(true);
  assert.equal((await request("Profile/GetAll")).data.profiles[0].id, id);
  assert.equal(
    (await request("Profile/Login", { profileId: id })).success,
    true,
  );
  assert.equal(
    (await request("System/DeleteAllUserData", { confirmation: "wrong" }))
      .success,
    false,
  );
  const before = (await request("Profile/GetAll")).data.dataGeneration;
  const pendingLogin = await request("Spotify/Login", { profileId: id });
  const pendingPath = new URL(pendingLogin.data.loginUrl).pathname;
  assert.equal(
    (
      await request("System/DeleteAllUserData", {
        confirmation: "DELETE ALL USER DATA",
      })
    ).success,
    true,
  );
  const after = await request("Profile/GetAll");
  assert.equal(after.data.profiles.length, 0);
  assert.notEqual(after.data.dataGeneration, before);
  assert.equal(
    (
      await fetch(`http://127.0.0.1:${port}${pendingPath}`, {
        redirect: "manual",
      })
    ).status,
    410,
    "User-data reset invalidates outstanding QR links",
  );
  await stop();
  await start();
  assert.equal((await request("Profile/GetAll")).data.profiles.length, 0);
  console.log(
    "PASS password-free profiles, restart persistence, public DTOs, QR state, phone receipt and guarded reset endpoints.",
  );
} finally {
  await stop();
  await rm(data, { recursive: true, force: true });
}
