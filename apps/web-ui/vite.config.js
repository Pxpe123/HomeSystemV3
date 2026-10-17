import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const deployments = fileURLToPath(new URL('../../Deployments/', import.meta.url))
const output = path.resolve(process.env.HOMESYSTEM_WEB_OUT_DIR || path.join(deployments, 'web-ui'))
const staging = fileURLToPath(new URL('../../.local/staging/', import.meta.url))
if (![deployments, staging].some(base => output.startsWith(path.resolve(base) + path.sep))) throw new Error('Web output must be inside Deployments/ or .local/staging/')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:8080', ws: true },
      '/api': { target: 'http://127.0.0.1:8080' },
      '/Spotify/Callback': { target: 'http://127.0.0.1:8080' },
    },
  },
  build: { outDir: output, emptyOutDir: true },
})
