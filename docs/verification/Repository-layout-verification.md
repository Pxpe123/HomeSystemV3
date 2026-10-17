# Repository layout verification — 17 October 2026

## Preserved and relocated

- Inventoried 268 existing maintained source/documentation files, including untracked working changes. SHA-256 check immediately after moves: 268 unchanged, zero missing. Full source-to-destination manifest: audits/layout-preservation.json. Already-deleted files were not recreated.
- Four applications moved to apps/. Redundant control-server/HomeSystem nesting removed. Server implementation grouped under src/{Domain/Models,Endpoints,Persistence,Platform,Services,Transport}; desktop-agent implementation grouped under src/. Namespaces, transport contracts and UI behaviour unchanged.
- Root solution, Docker build contexts, VS Code paths, root scripts and maintained documentation point at the new layout. Added package READMEs and repository navigation/check script. Frontend dependencies, .env.local and ignored build output moved with their package.
- Documentation split into architecture, guides, product, verification/audits and assets/screenshots. Existing audit JSON remains historical evidence with original captured paths. Qt deployment output and old reports preserved under ignored artifacts/.

## Checks

- `npm run verify` from root: layout check passed (14 entry points, both .NET solution project paths, Docker build contexts), frontend ESLint passed, 38 tests passed, production build and budget/plugin-boundary checks passed. Build output hashes/sizes unchanged after relocation: 425409-byte initial JavaScript, 79213-byte CSS.
- `dotnet sln HomeSystem.sln list`: resolves apps/control-server/CentralServer.csproj and apps/desktop-agent/PcAgent.csproj.
- `dotnet build HomeSystem.sln --no-restore --nologo`: reaches both relocated source trees; fails with existing CS1061 errors in server src/Platform/HomePlatform.cs:139 (Task.AsTask) and agent src/ServerConnection.cs:109 (JsonElement.RootElement), plus existing warnings. Their source hashes were unchanged. These errors were not fixed as part of a folder move.
- Qt bundled CMake `--list-presets -S apps/display-client`: resolves desktop-debug. Native Qt compilation and Android build not verified. Fresh build directories are required because old generated CMake caches contain absolute paths.
- Installed Docker CLI `compose config --quiet`: exited zero; warned that the local Docker config file could not be read. No image build/container launch claimed. Existing server runtime/healthcheck prerequisites are documented in the Docker guide.
- Isolated Vite preview restarted from apps/web-ui on 127.0.0.1:5174; fixture restarted from the same package on port 8499.
- Root `npm run dev` now explicitly selects the fixture WebSocket endpoint through the package's dev:isolated command, so it cannot inherit a real-household URL from a local environment file. Live browser login to UI Test and the existing Apps panel verified after relocation; local app layout persisted. The root readme check accepts the original tracked ReadMe.md spelling on case-sensitive checkouts (Windows displays the normalised README.md casing).

## Remaining local residue

Generated Qt Creator directories under old Packages/display-client/.qtcreator deny relocation, including an explicitly elevated native directory move. No ACLs/ownership changed and no tools forcibly closed. All real app source is relocated; ignored Packages/ contains this protected metadata only. Once the owning Qt tools/permissions release it, move that residual directory to artifacts/legacy-packages. Root layout check rejects any real files outside this metadata exemption.

No Git staging/reset, data deletion, package installation or remote deployment was performed. Empty former source containers were removed only after checking they were empty; all material output/editor data remains recoverable locally.
