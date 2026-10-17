# Setup, repository cleanup and Android verification — 17 October 2026

## Changes

App-specific solution/SDK/NuGet files moved into the respective app. Shared build conventions are under scripts/build; Compose and its environment example are under scripts/deployment. Old generated outputs were moved to ignored Deployments/archive for recovery. No Git reset/staging/commit and no permanent source deletion.

ControlServer now has a small entry point, hosting composition root, typed environment options, /api/health and System/Hello. Existing protocol/integrations were preserved. WebUI first-run verifies identity before mounting profile workflows, validates credential-free endpoints and persists per-display connection settings. Settings can reopen setup. Existing security/CSP boundaries remain.

Android selects Qt Quick/WebView and has native URL setup/retry, Internet/network permissions, ARM64 packaging and saved QSettings. Qt Maintenance Tool installed the missing 6.10.1 WebView module (and its matching installed-kit dependencies). Adoptium JDK 17.0.20.1+1 was downloaded from official metadata and checked against SHA-256 e53a79c3c3d86865bd7e787903884331068e71321714ffd44f145785affc7cb0. Existing SDK 36/build-tools/NDK r27c were reused. No new licence acceptance was automated.

## Executed checks

- Repository entry points, relocated solution references and Docker contexts pass layout validation.
- Frontend lint and 42 unit tests pass.
- Production WebUI builds within 430 kB initial JavaScript / 80 kB CSS gates; plugin boundaries pass.
- Strict setup frontend static audit: no findings (audits/setup-cleanup.json).
- Additional network-fetched designmd validator was blocked by approval review for third-party executable supply-chain risk; it was not bypassed or counted as passed.
- C# server Release build succeeds; existing nullable/obsolete warnings remain. Complete bundle also publishes Windows agent with existing Windows-platform warnings.
- Real server on temporary port 8500 returned HTTP 200 health identity and a correlated System/Hello protocolVersion 1 response over WebSocket; test process stopped afterwards.
- Desktop Qt configure/build/runtime packaging succeeded in the complete release assembly.
- Android ARM64 native compilation, Gradle packaging and debug signing succeed. AAPT confirms uk.homesystem.display, versionCode 1, min SDK 28, target SDK 36, native-code arm64-v8a.
- Complete release setup-android-2026-10-17 passed 119 file checksums; the final visual adjustment is published in the subsequent final bundle pointed to by Deployments/latest.json. Always verify that pointer with scripts/verify-release.mjs.
- Compose configuration resolves. Docker engine was unavailable; no claim of running container verification.
- Browser: detected fixture server verified; invalid credential-bearing URL rejected with field focus; reconnect succeeds; saved setup survives reload; settings reopens setup; unavailable endpoint shows bounded retry feedback; 390px layout inspected. Screenshot: docs/assets/screenshots/first-run-setup.png.

## Remaining boundaries

ADB lists no connected device, so no S24 FE install or on-phone runtime/touch/back-navigation verification was performed. The APK is debug-signed and LAN HTTP-enabled, not production release-signed. Native QML runtime behaviour still needs physical-device testing. Gradle's SDK metadata/deprecation and platform-specific QML import warnings remain non-fatal build warnings.

This is a foundation refactor, not an entire codebase quality guarantee: in-memory server profiles, static legacy services, unfinished persistence/auth migration, production framework security baseline and automated remote rollout remain. The deployment graph explicitly separates wired development from proposed release automation.
