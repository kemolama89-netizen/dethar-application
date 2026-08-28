import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Project site on GitHub Pages (https://kemolama89-netizen.github.io/dethar-application/),
  // so production asset URLs must be prefixed with the repo name. `vite
  // preview` serves the already-built dist/ as-is — its index.html has
  // that prefix baked into every asset URL from the build step — so it
  // needs the SAME base as `build`, or every request 404s against the
  // preview server's unprefixed static root (this previously fell through
  // to Vite's SPA fallback, which serves index.html for any unmatched
  // path — the exact "MIME type text/html instead of text/css" symptom).
  // Only the real dev server (Codespaces port forwarding, etc.), served
  // from the domain root, needs base '/'.
  base: command === 'build' || isPreview ? '/dethar-application/' : '/',
  plugins: [react(), tailwindcss()],
}))
