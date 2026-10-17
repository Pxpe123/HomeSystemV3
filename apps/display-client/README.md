# Display client

One configured WebUI address; UI changes do not require rebuilding the native wrapper.

## Desktop

Qt Widgets + WebEngine. Open CMakeLists.txt with the desktop Qt kit, or run `npm run build:display` from the repo root. Pass `--url http://YOUR-SERVER:8088` or HOMESYSTEM_UI_URL to the executable. Build caches live under `.local/`; packaged output is `Deployments/display-client/`.

## Android / S24 FE

CMake selects Qt Quick + Qt WebView on Android, not desktop WebEngine. ARM64-v8a, minimum API 28, target/compile API 36. The native first-run screen saves the WebUI address with QSettings; the web setup verifies the same-origin HomeSystem server. Android Back opens native address setup.

Verified on this build machine:

- Qt 6.10.1 Android ARM64 and matching 6.10.1 desktop host tools.
- Qt WebView installed through Qt Maintenance Tool.
- SDK platform 36, build-tools 36.0.0, platform-tools and NDK 27.2.12479018.
- Temurin JDK 17, checksum verified, under ignored .local/tools/java17.
- Gradle 8.14.3 / AGP 8.10.1 from the Qt-provided template; no custom Gradle fork is maintained.

These versions follow [Qt 6.10 Android requirements](https://doc.qt.io/qt-6.10/android.html) and [prerequisites](https://doc.qt.io/qt-6.10/android-getting-started.html).

Copy build.example.json to ignored build.local.json and adjust local paths. Existing SDK licences were already installed; scripts do not accept new licences automatically.

```powershell
node scripts/build-android.mjs --check
node scripts/build-android.mjs
```

Run from repo root. Test APK: .local/packages/display-client/android-arm64-debug/HomeSystem-debug.apk. A full `npm run build` also includes it inside the release's display-client/android folder.

## GitHub downloads

The Build workflow has Qt Windows x64 and Android ARM64 jobs on GitHub-hosted Windows runners. Open **Actions → Build → successful run → Artifacts**, then download `display-client-windows` or `display-client-android`. Windows includes its Qt/WebEngine runtime; extract the whole ZIP and launch `bin/HomeSystemV3.exe`. Android contains `HomeSystem-debug.apk`. Each artifact includes shared build metadata and file checksums, and is retained for 14 days. See [CI toolchains and signing limitations](../../docs/guides/GitHub-Deployment.md#download-native-clients).

Enable Developer options / USB debugging on the S24 FE and approve this computer on the phone. Then install the test APK with Android Studio/Qt Creator or `adb install -r <APK>`. No phone was connected during verification, and no device install was performed. Use your PC/server LAN address, not 127.0.0.1, when entering the display URL on the phone.

## Before production distribution

This is a debug-signed development package. Local HTTP is currently allowed for LAN testing; use HTTPS and disable cleartext traffic for production. Keep the signing key outside source, increment versionCode for updates, and sign release APK/AAB with the same owned key. Do not use debug signing for unattended production updates. Ordinary Android applications cannot silently replace themselves: managed device enrolment / MDM or an appropriate store distribution channel is required for unattended native updates. WebUI changes still arrive from the configured server without APK replacement.

Qt 6.10.1 and desktop 6.7.3 are the installed kits used here, not a recommendation to freeze old versions permanently. Validate current supported Qt/security updates before production rollout.
