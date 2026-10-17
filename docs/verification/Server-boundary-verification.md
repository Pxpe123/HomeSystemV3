# Server boundary audit — 17 October 2026

- Audited React source, CSS/index, Qt bundled web/QML resources, production nginx, browser transport and integration adapters. No direct third-party API fetch/SDK/token exchange was present. Server endpoint registration matches the existing Weather and Spotify client commands.
- Removed the external-resource bypass from Spotify artwork: all image bindings now use a same-origin/embedded-raster policy; unsupported remote covers use existing placeholders. Server-provided embedded QR images remain supported.
- Added source-level networking/import guardrails and production same-origin connection/image CSP. Did not disable legitimate client-to-HomeSystem requests or add fake success responses.
- Frontend verification: ESLint passed, 40 tests passed (including URL policy and ESLint enforcement regression), production build and plugin/bundle checks passed. Root layout check and git diff whitespace check passed.
- Production nginx/browser CSP was inspected statically, not end-to-end verified in a container. The known server compilation error still blocks claiming a working full production stack. No generic media proxy was added; remote artwork intentionally remains a placeholder until a reviewed server implementation exists.
