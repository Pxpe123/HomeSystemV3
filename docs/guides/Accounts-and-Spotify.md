# Household profiles and Spotify

## Ownership and storage

Profiles are household selectors, not identity verification. They have names, stable IDs, timestamps, preferences and an optional linked Spotify account ID. There are no passwords, PIN prompts or password fields. Anyone who can reach this server/display can select a profile and use its linked services. Keep the server on a trusted network; the public Spotify callback is not a replacement for network authentication.

`AccountRepository` owns serialized updates. It writes a complete snapshot to `accounts.json.next`, flushes the file, then atomically replaces `accounts.json` before replying success. Concurrent creates enforce unique case-insensitive trimmed names. Failed writes leave the published state unchanged. Corrupt/unreadable/unsupported storage prevents startup rather than silently resetting data. This is a small single-server JSON store, not a multi-instance database or a guarantee against every power-loss failure.

The Docker volume `homesystem-data` is mounted at `/var/lib/homesystem` through `HOMESYSTEM_DATA`. Keep that volume across updates. Back up **both `accounts.json` and `keys/` together**, privately, with the server stopped or using a consistent filesystem snapshot. The account file contains encrypted access/refresh tokens; ASP.NET Data Protection keys are in `keys/`. Linux account files are owner-only and the data/key directories are owner-only. Volume/host administrators can access the key material, so host access, disk encryption and protected backups remain important. Never commit, log, export publicly or put either into container images.

Runtime playback/devices/playlists are caches, not durable account records. Public profile responses never include provider tokens. Browsers retain only a profile ID, server connection information and their existing local runtime state—not Spotify credentials.

## Spotify lifecycle

Outside Docker, the default is the operating system's per-user local application-data directory under `HomeSystem/ControlServer`, not the build/output directory. An explicit `HOMESYSTEM_DATA` must be an absolute persistent path. Replacing `Deployments/control-server/` must never replace the account store.

1. A chosen profile starts `Spotify/Login` with its profile ID. The server creates random, expiring OAuth state bound to that profile, not whatever the browser happens to select later.
2. The QR contains only an HTTPS `/s/` link with a random 22-character identifier, rather than Spotify's long authorization URL. The server redirects it to its own stored Spotify request. Links expire after ten minutes and become invalid when the callback is consumed or user data is reset. Link previews do not consume the session. The phone completes Spotify consent; the callback validates/consumes the state and saves the account credentials and profile link in one durable change.
3. The phone receives a same-origin redirect to a short-lived, single-use `/Spotify/Connected` receipt. Its standalone page does not need the WebUI, saved display setup or a local profile. Personal account details and tokens are not put in the redirect URL.
4. The display receives `Spotify/LoginResult` with the originating profile ID and reloads the saved profile. If its socket closed, the saved link remains and is loaded on reconnect/profile refresh. Choosing a different profile never reassigns the callback.
5. A valid token is reused. Near expiry (60-second safety margin), requests serialize behind one refresh per Spotify account. A returned refresh token replaces the old one; an omitted refresh token preserves the old one. The result is saved before use. No unconditional half-hour refresh loop remains; inactive accounts are not polled indefinitely.
6. Temporary provider failures retain credentials and back off. Spotify `invalid_grant` clears unusable credentials, persists reconnect-required status, and stops repeated refresh attempts. Reauthorization still requires the user if Spotify expires/revokes the refresh token; refresh cannot bypass consent.

The configured Spotify redirect URI remains the HTTPS callback registered in the provider dashboard. Do not replace it with an arbitrary private HTTP IP. Review endpoint/scopes in `SpotifyManager.Login` when changing provider functionality.

## First upgrade from the in-memory server

Old process-only tokens cannot be recovered through public profile endpoints. Do not assume existing links will migrate just because a Docker volume exists. Before deploying this change, record/export the household profile names/IDs using the existing read-only profile endpoint if needed. The old server must remain running until you have chosen a migration/recreation plan. A one-time Spotify relink may be necessary because the previous implementation never saved its credentials. Do not add a public token-export endpoint or dump process memory to work around that.

Once accounts are created/linked with this version, they survive normal container recreation with the same volume and keys. Deleting the last profile linked to an account or unlinking its final association removes its stored credentials. This does not revoke the app permission inside Spotify; do that in Spotify's account controls when required.

## Testing reset

Settings → Connection offers **Delete all user data**. It is available only when the server explicitly sets `HOMESYSTEM_ALLOW_DATA_RESET=true`. Do not enable that on a publicly reachable service without an access-control policy. The user must type `DELETE ALL USER DATA` and confirm. No browser-native confirmation dialogs or automatic wipes are used.

The operation durably removes all server profiles and stored Spotify credentials, clears their runtime caches, and changes the server data-generation marker. This display clears timers, stopwatch, notifications, saved app data and preferences after acknowledgement. Other displays clear their local state when they next fetch profiles/reconnect; an offline browser cannot be erased remotely immediately. Installed application packages, server connection/provider configuration, encryption keys and build metadata are preserved. It is not secure erasure of historical disk blocks, backups, old containers or Git history. The test suite only deletes its own disposable data; it does not wipe your Pi.

## Verification

From `apps/control-server`:

```sh
dotnet restore HomeSystem.sln --configfile NuGet.Config --locked-mode
dotnet run --project tests/AccountTests.csproj -c Release --no-restore
node tests/verify-accounts.mjs
```

The tests use fake credentials and no Spotify requests. They cover encryption/restart, concurrent refresh, rotation, revoked/transient failures, write failures, password-field removal, standalone phone receipts and guarded reset endpoints. A real Spotify consent/refresh and physical scanning phone still need end-to-end verification.

Provider contract: [Spotify token refresh documentation](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens).
