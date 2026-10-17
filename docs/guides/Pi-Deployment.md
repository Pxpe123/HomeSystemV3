# Raspberry Pi deployment

Host: `Jay@192.168.50.27`, SSH port 22; ARM64 Raspberry Pi OS.

The linked stack uses `/opt/stacks/homesystem-v3/compose.yaml` and the verified server/WebUI bundle in its adjacent `bundle/` directory. Docker builds images natively for ARM64. Do not copy the Windows Qt or desktop-agent binaries onto the Pi.

WebUI address: `http://192.168.50.27:8088/`. Browser and Qt displays use this single address; nginx proxies `/ws` and `/api` to the same ControlServer published on `http://192.168.50.27:8080/`. Run exactly one ControlServer and one WebUI.

Verified on 17 October 2026: both ARM64 images built on the Pi; both current containers report healthy and use `unless-stopped`. After retiring the old server, health checks through port 8080, WebUI port 8088 and `https://jay.cpope.uk/api/health` all return the current ControlServer identity with HTTP 200. The private environment file has mode 600. Spotify consent and end-to-end login still require a fresh user login; previous pending sessions were cleared by restart.

## Operations

Run on the Pi:

```sh
docker compose -f /opt/stacks/homesystem-v3/compose.yaml ps
docker compose -f /opt/stacks/homesystem-v3/compose.yaml logs --tail 100 -f
docker compose -f /opt/stacks/homesystem-v3/compose.yaml up -d --wait --wait-timeout 180
```

To watch application output from Windows PowerShell:

```powershell
ssh -t Jay@192.168.50.27 "docker compose -f /opt/stacks/homesystem-v3/compose.yaml logs --tail 50 -f"
```

Enter the password interactively; do not put it in the command or a script. The startup/health-gate transcript is also available at `/home/Jay/homesystem-startup.log`.

The private `.server.env` file copies existing provider settings from the legacy container without displaying them, uses Liverpool, and sets the public WebUI URL to the Pi gateway. It must not be committed, printed, or copied into image layers. `prepare-pi-environment.py` deliberately refuses to overwrite an existing environment file. Subsequent updates should preserve that file.

The source stack definition is `scripts/deployment/pi.compose.yaml`. Rebuild the local applications before transferring updated `Deployments/control-server`, `Deployments/web-ui` and `Deployments/infra` into the remote bundle. Then run Compose build followed by Compose up with the health gate. This is a manual deployment procedure, not an automatic CI pipeline.

## Retired legacy stack

The original `homesystem-centralserver-1` container is stopped with its restart policy disabled. Its configuration and `/opt/CentralServer/ServerFiles` are retained for recovery only. Do not start it alongside the current stack: port 8080 belongs to the current ControlServer.

No existing images, containers, bind mounts or volumes are pruned. The new stack provisions `homesystem-data` for the persistence boundary, but the current profile implementation is still in-memory. Existing live profiles are not silently migrated to the new server and may need to be recreated.

The existing public domain now reaches the current server on port 8080, as verified by its health endpoint. No public DNS, router forwarding, TLS settings, passwords or SSH keys were changed. A successful health check is not proof of completed Spotify authentication.
