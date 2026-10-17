# Server-owned integrations

The browser renders state and sends HomeSystem commands through the one ServerClient WebSocket transport. It must not call Spotify, weather, solar, device or other provider APIs directly. Keys, OAuth token exchanges, refresh tokens and provider SDKs belong in the control server. Client-to-HomeSystem commands are necessary and are not external integration calls.

## Audit findings

- Weather/GetWeather and Weather/GetForecast already request the server; matching handlers exist in the server endpoint registry.
- Spotify linking, polling, playback, search and playlist tracks already request the server; matching handlers exist. No Spotify browser SDK or browser OAuth token exchange is present.
- Profiles/household flows also use the shared server transport. The callback page reads server-supplied display parameters and does not exchange credentials with Spotify.
- SolarTimes is local arithmetic, not an API call. Source-attribution links are user navigation, not background provider requests.
- React/Qt bundled static resources do not use external API fetches. The Qt webchannel script is a bundled qrc resource.
- Spotify artwork fields previously rendered provider-hosted URLs directly, bypassing the desired server-only resource boundary. Those URLs now render the existing artwork placeholders instead.

## Media placeholder contract

ServerMedia.serverImage accepts same-origin HTTP(S) resources and embedded raster data images (PNG/JPEG/GIF/WebP). It rejects external hosts, credential-bearing URLs, script/blob URLs and SVG data payloads. All Spotify artwork and QR image render paths, including persisted active-widget artwork, use this boundary.

An actual server media proxy is not implemented by this change. Until one exists, provider-hosted covers intentionally use the existing musical artwork placeholder. Future server responses can supply an opaque same-origin media URL or embedded image bytes. A proxy must resolve server-owned media IDs and validate upstream hosts; do not introduce an unrestricted URL-fetch endpoint. Provider keys/tokens must never appear in client URLs or VITE environment variables.

## Enforcement

- ESLint rejects fetch/XMLHttpRequest/EventSource and per-app WebSocket clients, common HTTP/provider SDK imports, and browser beacon calls in src/. Only core/ServerClient owns WebSocket construction.
- Production nginx sends a Content-Security-Policy limiting connections to the UI origin and images to that origin/embedded data. /api and /ws are reverse-proxied to the control-server service. Development uses the explicit loopback fixture transport and does not inherit this production CSP, so source lint/tests remain necessary.
- tests/server-boundary.test.js covers media URL policy and verifies forbidden networking patterns fail lint while the canonical transport is allowed.

This is layered application enforcement, not a sandbox for hostile plugins; bundled app code remains trusted. Deliberately obfuscated networking or a future server redirect still requires security review. Server compilation/integration limitations remain documented separately.
