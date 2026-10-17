# Desktop agent

.NET 9 PC monitoring/control agent. Build from the repository root with `npm run build:agent`. Implementation and models live under src/; project metadata stays here.

This remains a scaffold: `src/SystemMonitor.cs` contains Windows monitoring helpers, but the entry point does not yet connect them to ControlServer or provide an installed Windows service. Do not treat a successful build as a working remote-control integration. No agent/service installation or remote commands run automatically.
