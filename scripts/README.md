# Repository tooling

check-layout.mjs verifies maintained app entry points, .NET solution paths and Docker build contexts. Run through `npm run check:layout` from the repository root.

operations/ contains existing manual SSH helpers and their configuration example. They keep their existing behaviour; they are never run by development, build or verification commands.
