# Repository layout

```text
HomeSystemV3/
  apps/
    control-server/
      HomeSystem.sln, CentralServer.csproj, global.json, NuGet.Config
      Dockerfile, Dockerfile.artifact, packages.lock.json
      src/
        Program.cs           small entry point
        Hosting/             composition root and typed environment options
        Domain/Models/       existing domain data
        Endpoints/           request handlers, identity handshake
        Transport/           WebSocket transport and registry
        Services/            integration/background services
        Persistence/         existing persistence boundary (not a finished database)
        Platform/            existing experimental V4 implementation
    desktop-agent/           Windows agent, project configuration and src/
    display-client/          CMake, desktop/Android sources, QML, package manifest
    web-ui/                  React app, plugins, runtime, setup, tests and app tooling
  scripts/
    build/                   shared .NET output conventions
    deployment/              linked Compose stack and environment example
    operations/              retained manual operations helpers
    build-release.mjs        verified current-build assembler
    build-android.mjs        ARM64 debug APK build/check
  docs/                      product, architecture, guides and verification
  Deployments/               ignored current builds, no timestamp folders
    control-server/          published server
    desktop-agent/           published Windows agent
    web-ui/                  production web assets
    display-client/          packaged desktop client and Android test APK
    infra/                   Dockerfiles and linked Compose stack
    release.json             current build manifest and checksums
  .local/                    ignored tools, caches, intermediates and staging
  .vscode/                   shared workspace launch settings
  package.json               repository commands, no frontend dependencies
  DESIGN.md, UX-CONTRACT.md   shared visual and behaviour contracts
  README.md, .gitignore
```

Application-owned solution/SDK/package settings are no longer in the repository root. Each .NET app imports shared output conventions; frontend dependencies stay inside web-ui. All build and publish output goes under Deployments. Local IDE metadata and node_modules remain ignored, app-local developer state—not deployable source.

Old Packages sources are now under apps. Legacy artifacts, old Qt builds and previous bin/dist outputs are preserved under Deployments/archive, not deleted. Historical verification reports intentionally retain historical paths. Existing uncommitted changes were preserved; no reset, staging or commit was performed.

Run `node scripts/check-layout.mjs` to check solution references, app entry points and Compose build contexts.
