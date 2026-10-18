# GitHub builds and Pi deployment

```text
Push / pull request → WebUI lint + tests + build; .NET locked restore + publish
                   → native ARM64 Docker builds (ControlServer + WebUI)
                   → Qt Windows x64 package + Android ARM64 debug APK
Successful main    → GHCR images tagged with the exact Git commit
                   → Pi runner pulls BOTH images before making changes
                   → recreate one server :8080 + one WebUI :8088
                   → health checks; restore previous images if rollout fails
Display clients    → load the updated WebUI from the same Pi address
```

## One-time activation

Pi runner provisioned on 17 October 2026: official ARM64 runner 2.337.0, verified against the supplied SHA256, registered as `homesystem-pi` in `/opt/actions-runner`, with the custom `homesystem-pi` label. The systemd service runs as `Jay` and is enabled at boot. Registration credentials remain on the Pi, not in this repository. Automated container rollout was verified for commit `14f06d4` on 18 October 2026; the added Qt CI jobs still need their first GitHub run.

1. Commit and push the source and `.github/workflows/` files. Nothing is automatically committed or pushed by the local setup.
2. Enable Actions in the repository. Allow the pinned GitHub actions used in these workflows. The Build workflow receives `packages: write` only for its image jobs; package publishing uses the short-lived `GITHUB_TOKEN`, not an SSH password or personal token.
3. Create the GitHub environment `homesystem-pi`. Restrict deployment branches to `main`; do not require manual approval if fully automatic rollout is wanted. Protect `main` and limit repository write access.
4. In repository Settings → Actions → Runners → New self-hosted runner, select Linux / ARM64. On the Pi install the official runner into `/opt/actions-runner` (not the app's deployment directory), using the download URL and checksum GitHub displays. Configure it for this repository with the custom label `homesystem-pi`. Register using GitHub's short-lived token interactively; never commit or paste tokens into repository files.
5. Run the runner service as the existing deployment user `Jay`, who already has Docker access and owns `/opt/stacks/homesystem-v3`. From the runner directory: `sudo ./svc.sh install Jay`, then `sudo ./svc.sh start`. The runner needs Python 3, Git, Docker and Compose; it does not compile applications on the Pi. No inbound SSH exposure or router port-forwarding is needed for GitHub Actions.
6. Verify the runner is Online in GitHub. Push to `main` to exercise the full pipeline. If the first deployment was queued while registering, it can proceed once the runner comes online. If a package already exists, grant this repository Actions access in that GHCR package's settings.

The runner must NOT execute untrusted pull requests: only the separate successful-main deployment workflow targets it. A runner with Docker access is highly privileged. GitHub warns against self-hosted runners for public repositories; a dedicated deployment host and strict write permissions are important. If the repository is public, assess that exposure before registration; do not add broad runner access for other workflows.

## Status and boundaries

Deployment freshness: the helper reads the current `main` SHA directly from GitHub before pulling and again immediately before replacing containers. A superseded build fails without deploying; it never silently falls back to an older successful commit. The final health gate compares server and WebUI version, build ID, commit and UTC build time, and requires the exact triggering workflow run. Commit-tagged images are pulled explicitly, rather than trusting a cached `current`/`latest` tag. The command wrapper supports captured image-ID lookups; offline tests cover this contract so logging changes cannot silently break deployment again.

Build identity is visible under Settings → Connection. CI versions use `3.0.<run number>+<attempt>.<short commit>`; reruns have distinct build IDs. `/api/version` and `/build-info.json` expose immutable server/UI metadata. These timestamps are build stamps, not file modification or application startup times. Matching metadata verifies artifact identity, not every integration's functionality.

README badges link to Build and Deploy Pi. Opening them shows queued/running jobs and logs. A badge is workflow status, not continuous uptime monitoring. Failed builds never deploy. Superseded main commits are rejected with a clear stale-build error. Deployment jobs serialize without cancelling a rollout midway. Existing `.server.env`, the named `homesystem-data` volume and unrelated containers are preserved. No automatic image pruning is performed.

Only ControlServer and WebUI belong in the Pi Docker stack. Windows agent output is a downloadable build artifact, not a Linux container. The Build workflow also packages Qt Windows/Android clients on GitHub-hosted Windows 2022 runners, using Qt 6.10.1. Native failures make the workflow fail and prevent Pi rollout. These jobs do not run on the Pi or install anything onto a PC/phone. Their hosted WebUI updates on reload without reinstalling the wrapper. An app already open may need a reload. Production signing and unattended native delivery still require a separate distribution policy.

## Download native clients

Use the large **Download Android APK** and **Download Windows EXE** buttons at the top of the repository README. They resolve to assets on the latest published development build: `HomeSystem-debug.apk` and `HomeSystem-Setup.exe`. No ZIP extraction is needed. Windows uses a per-user installer containing Qt/WebEngine and app-local MSVC runtime DLLs; it creates a Start menu entry and uninstaller without requesting administrator access. Both packages are testing builds, not production-signed releases; Windows may warn about an unsigned installer.

The `client-downloads` job runs only for trusted `main` builds after checks, both native jobs and both container jobs succeed. It verifies artifact checksums and shared build identities before uploading binaries, manifests and `SHA256SUMS.txt` to a draft release. Only a complete upload is published and marked latest; existing public downloads remain until then. Each release uses a new build/run-attempt tag pointing to the exact commit; it does not move old tags or overwrite old assets. The publisher refuses to promote a superseded main commit. Download URLs work after the first successful publishing run. Releases are marked latest for stable direct links, but explicitly labelled development/testing builds, not production readiness. Only this publishing job receives repository write permission.

For portable files or individual job diagnostics, open **Actions → Build → a successful run → Artifacts** while signed into GitHub:

- `display-client-windows`: includes `HomeSystem-Setup.exe`, plus the portable `bin/` tree. For portable use, extract the entire ZIP and run `bin/HomeSystemV3.exe`. Keep its DLLs, plugins, resources and WebEngine helper alongside it; that EXE alone is not portable.
- `display-client-android`: extract `HomeSystem-debug.apk` and install it on an ARM64 Android device such as the S24 FE. Minimum API 28, target API 36. This is explicitly a debug-signed testing APK, not a Play Store release.
- `application-builds`: server, desktop agent and WebUI output from the existing checks job.

Native Actions artifacts are retained for 14 days; published release assets remain until explicitly removed. Each contains `build-info.json` with the shared workflow version, commit, build ID/time and SHA256 file checksums. The Android job installs JDK 17, SDK platform/build-tools 36 and NDK 27.2.12479018; it explicitly accepts SDK licences on the disposable CI runner. Qt's Android installer supplies matching host tools. The Windows installer compiler is Inno Setup 7.1.0, downloaded from its official release and checked against a pinned SHA256 before installation into ignored local tooling. Actions are SHA-pinned and caches hold toolchains only, not account data or signing secrets.

GitHub creates a fresh Android debug key on each clean runner. Consequently, replacing an APK from another run/local machine may require uninstalling the old testing app (which removes its native settings). Stable signing across updates is intentionally not claimed; configure a protected owned signing key before production distribution. GitHub artifact download is not an app-update service.

Container recreation restarts the server: pending OAuth attempts expire, but profiles and encrypted Spotify credentials now persist in `homesystem-data` when created by the persistent account implementation. Older process-only accounts require a migration/recreation plan before their first upgrade; see [account storage](Accounts-and-Spotify.md). Health-based image rollback does not undo data migrations. There will be a brief update interruption, not zero-downtime deployment.

The first automated rollout saves the registry compose configuration and image references to `/opt/stacks/homesystem-v3/compose.yaml` and `.env`. Existing operations commands continue to work from the stack directory. Do not use the old local-build compose to start a second stack.

Sources: [GitHub runner setup](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners), [runner security](https://docs.github.com/en/actions/reference/security/secure-use), [GitHub-hosted ARM64 runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
