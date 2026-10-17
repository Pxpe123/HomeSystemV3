import test from "node:test";
import assert from "node:assert/strict";
import { ESLint } from "eslint";
import { serverImage } from "../src/core/ServerMedia.js";

test("media allows HomeSystem assets and server-generated raster payloads only", () => {
  const origin = "https://home.example";
  assert.equal(
    serverImage("/api/media/cover/123", origin),
    origin + "/api/media/cover/123",
  );
  assert.equal(
    serverImage(origin + "/cover.png", origin),
    origin + "/cover.png",
  );
  assert.equal(
    serverImage("data:image/png;base64,aGVsbG8=", origin),
    "data:image/png;base64,aGVsbG8=",
  );
  for (const value of [
    "https://i.scdn.co/cover.png",
    "//external.example/cover.png",
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "https://user:secret@home.example/cover.png",
    "",
    null,
  ])
    assert.equal(serverImage(value, origin), null);
});

test("frontend lint blocks bypasses around the server transport", async () => {
  const eslint = new ESLint();
  for (const code of [
    "fetch('/api/test');",
    "window.fetch('/api/test');",
    "globalThis.fetch('/api/test');",
    "new XMLHttpRequest();",
    "new globalThis.WebSocket('wss://provider.example');",
    "new EventSource('/events');",
    "navigator.sendBeacon('/metrics');",
    "import axios from 'axios'; axios.get('/api/test');",
  ]) {
    const [result] = await eslint.lintText(code, {
      filePath: "src/plugins/example/Page.jsx",
    });
    assert.ok(
      result.messages.some((message) =>
        message.ruleId?.startsWith("no-restricted-"),
      ),
      code,
    );
  }
  const [transport] = await eslint.lintText(
    "export const Socket = globalThis.WebSocket;",
    { filePath: "src/core/ServerClient.js" },
  );
  assert.equal(transport.errorCount, 0);
});
